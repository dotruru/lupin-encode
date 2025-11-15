"""
Notification Service for Ethical Jailbreak Disclosure
Sends notifications to AI providers when their models are successfully jailbroken
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional, Dict, Any
import aiohttp
import fnmatch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import AIProvider, JailbreakNotification, Attempt, TestRun, Exploit
from app.services.provider_lookup import ProviderLookupService

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for sending jailbreak notifications to AI providers"""

    def __init__(self, db: AsyncSession, config: Dict[str, Any]):
        self.db = db
        self.smtp_host = config.get("smtp_host")
        self.smtp_port = config.get("smtp_port", 587)
        self.smtp_user = config.get("smtp_user")
        self.smtp_password = config.get("smtp_password")
        self.from_email = config.get("from_email", "security@lupin-red-team.com")
        self.notification_enabled = config.get("notification_enabled", True)
        self.perplexity_api_key = config.get("perplexity_api_key")

    async def find_provider_for_model(self, model_name: str) -> Optional[AIProvider]:
        """
        Find the AI provider responsible for a given model name.
        Uses pattern matching against provider's model_patterns.

        Examples:
        - 'gpt-4' matches provider with pattern 'gpt-*'
        - 'claude-3-opus' matches provider with pattern 'claude-*'
        """
        stmt = select(AIProvider).where(AIProvider.notification_enabled == True)
        result = await self.db.execute(stmt)
        providers = result.scalars().all()

        for provider in providers:
            if provider.model_patterns:
                for pattern in provider.model_patterns:
                    if fnmatch.fnmatch(model_name.lower(), pattern.lower()):
                        logger.info(f"Matched model '{model_name}' to provider '{provider.provider_name}' via pattern '{pattern}'")
                        return provider

        logger.warning(f"No provider found for model: {model_name}")
        return await self._discover_provider_via_perplexity(model_name)

    async def _discover_provider_via_perplexity(self, model_name: str) -> Optional[AIProvider]:
        if not self.perplexity_api_key:
            return None

        try:
            lookup_service = ProviderLookupService(self.perplexity_api_key)
            provider_data = await lookup_service.find_provider(model_name)
            if not provider_data:
                return None

            provider = AIProvider(
                provider_name=provider_data.get("provider_name"),
                company_name=provider_data.get("company_name") or provider_data.get("provider_name"),
                security_email=provider_data.get("security_email"),
                webhook_url=provider_data.get("webhook_url"),
                contact_name=None,
                notification_enabled=True,
                notification_method="email" if provider_data.get("security_email") else "webhook" if provider_data.get("webhook_url") else "email",
                model_patterns=provider_data.get("model_patterns"),
                extra_data={
                    "contact_url": provider_data.get("contact_url"),
                    "auto_discovered": True
                }
            )
            self.db.add(provider)
            await self.db.commit()
            await self.db.refresh(provider)
            logger.info("Auto-added provider %s for model %s via Perplexity", provider.provider_name, model_name)
            return provider
        except Exception as e:
            logger.error("Failed Perplexity provider lookup: %s", e, exc_info=True)
            return None

    async def send_jailbreak_notification(
        self,
        model_name: str,
        jailbreak_prompt: str,
        model_response: str,
        attempt_id: Optional[str] = None,
        test_run_id: Optional[str] = None,
        exploit_id: Optional[str] = None,
        exploit_cve_id: Optional[str] = None,
        severity: str = "high"
    ) -> bool:
        """
        Send a notification to the AI provider when their model is jailbroken.

        Args:
            model_name: The model that was jailbroken
            jailbreak_prompt: The PIE that succeeded
            model_response: The model's response to the jailbreak
            attempt_id: Optional ID of the Attempt record
            test_run_id: Optional ID of the TestRun record
            exploit_id: Optional ID of the known Exploit used
            exploit_cve_id: Optional CVE ID of the exploit (e.g., PIE-2024-001)
            severity: Severity level (low, medium, high, critical)

        Returns:
            bool: True if notification sent successfully
        """
        if not self.notification_enabled:
            logger.info("Notifications are disabled globally")
            return False

        # Find the provider for this model
        provider = await self.find_provider_for_model(model_name)
        if not provider:
            logger.warning(f"Cannot send notification: No provider configured for model '{model_name}'")
            return False

        # Create notification record
        notification = JailbreakNotification(
            provider_id=provider.id,
            attempt_id=attempt_id,
            test_run_id=test_run_id,
            exploit_id=exploit_id,
            model_name=model_name,
            jailbreak_prompt=jailbreak_prompt,
            notification_status="pending",
            extra_data={
                "severity": severity,
                "exploit_cve_id": exploit_cve_id,
                "model_response_preview": model_response[:500] if model_response else None,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

        success = False
        try:
            # Send via email
            if provider.notification_method in ["email", "both"] and provider.security_email:
                notification.notification_method = "email"
                email_success = await self._send_email_notification(
                    provider=provider,
                    model_name=model_name,
                    jailbreak_prompt=jailbreak_prompt,
                    model_response=model_response,
                    exploit_cve_id=exploit_cve_id,
                    severity=severity
                )
                if email_success:
                    notification.notification_status = "sent"
                    notification.notification_response = "Email sent successfully"
                    success = True
                else:
                    notification.notification_status = "failed"
                    notification.notification_response = "Email delivery failed"

            # Send via webhook
            if provider.notification_method in ["webhook", "both"] and provider.webhook_url:
                notification.notification_method = "webhook" if provider.notification_method == "webhook" else "both"
                webhook_success, webhook_response = await self._send_webhook_notification(
                    provider=provider,
                    model_name=model_name,
                    jailbreak_prompt=jailbreak_prompt,
                    model_response=model_response,
                    attempt_id=attempt_id,
                    test_run_id=test_run_id,
                    exploit_id=exploit_id,
                    exploit_cve_id=exploit_cve_id,
                    severity=severity
                )
                if webhook_success:
                    notification.notification_status = "sent"
                    notification.notification_response = webhook_response
                    success = True
                else:
                    notification.notification_status = "failed"
                    notification.notification_response = webhook_response

            # Save notification record
            self.db.add(notification)
            await self.db.commit()

            if success:
                logger.info(f"Successfully notified {provider.provider_name} about jailbreak of {model_name}")
            else:
                logger.error(f"Failed to notify {provider.provider_name} about jailbreak of {model_name}")

            return success

        except Exception as e:
            logger.error(f"Error sending notification: {str(e)}", exc_info=True)
            notification.notification_status = "failed"
            notification.notification_response = f"Exception: {str(e)}"
            self.db.add(notification)
            await self.db.commit()
            return False

    async def _send_email_notification(
        self,
        provider: AIProvider,
        model_name: str,
        jailbreak_prompt: str,
        model_response: str,
        exploit_cve_id: Optional[str],
        severity: str
    ) -> bool:
        """Send email notification to provider's security team"""
        try:
            # Create email
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[LUPIN SECURITY ALERT] Jailbreak Detected: {model_name}"
            msg["From"] = self.from_email
            msg["To"] = provider.security_email

            # Email body
            text_body = f"""
Security Alert: AI Model Jailbreak Detected
============================================

Dear {provider.company_name} Security Team,

This is an automated notification from Lupin Red Team Platform. We have successfully jailbroken
one of your AI models during our security testing operations.

VULNERABILITY DETAILS
---------------------
Model Affected: {model_name}
Severity: {severity.upper()}
{f'CVE ID: {exploit_cve_id}' if exploit_cve_id else 'CVE ID: Not assigned'}
Detection Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}

JAILBREAK PROMPT (PIE)
----------------------
{jailbreak_prompt[:1000]}
{'... (truncated)' if len(jailbreak_prompt) > 1000 else ''}

MODEL RESPONSE (PARTIAL)
------------------------
{model_response[:500]}
{'... (truncated)' if len(model_response) > 500 else ''}

RECOMMENDED ACTIONS
-------------------
1. Review the provided prompt injection exploit (PIE)
2. Test the vulnerability in your internal environment
3. Implement appropriate safety guardrails
4. Update model training or filtering mechanisms
5. Monitor for similar attack patterns

ABOUT THIS NOTIFICATION
-----------------------
Lupin is an AI red-teaming platform designed to test and improve AI safety. We send these
notifications to ensure responsible disclosure and help improve the security of AI systems.

This notification was sent in compliance with ethical disclosure practices.

For questions or to discuss this vulnerability, please contact: security@lupin-red-team.com

Best regards,
Lupin Red Team Platform
Automated Security Notification System
"""

            html_body = f"""
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .header {{ background-color: #d32f2f; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; }}
        .section {{ margin: 20px 0; }}
        .section-title {{ font-weight: bold; color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 5px; }}
        .code-block {{ background-color: #f5f5f5; border-left: 4px solid #d32f2f; padding: 10px; margin: 10px 0; font-family: monospace; white-space: pre-wrap; }}
        .severity-{severity} {{ background-color: #ffebee; border: 1px solid #d32f2f; padding: 10px; margin: 10px 0; }}
        .footer {{ background-color: #f5f5f5; padding: 15px; margin-top: 30px; font-size: 0.9em; color: #666; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>LUPIN SECURITY ALERT</h1>
        <h2>AI Model Jailbreak Detected</h2>
    </div>

    <div class="content">
        <p>Dear {provider.company_name} Security Team,</p>

        <p>This is an automated notification from <strong>Lupin Red Team Platform</strong>. We have successfully jailbroken
        one of your AI models during our security testing operations.</p>

        <div class="section severity-{severity}">
            <strong>⚠️ CRITICAL SECURITY VULNERABILITY</strong><br>
            Immediate attention required
        </div>

        <div class="section">
            <div class="section-title">VULNERABILITY DETAILS</div>
            <ul>
                <li><strong>Model Affected:</strong> {model_name}</li>
                <li><strong>Severity:</strong> <span style="color: #d32f2f;">{severity.upper()}</span></li>
                <li><strong>CVE ID:</strong> {exploit_cve_id if exploit_cve_id else 'Not assigned'}</li>
                <li><strong>Detection Time:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</li>
            </ul>
        </div>

        <div class="section">
            <div class="section-title">JAILBREAK PROMPT (PIE)</div>
            <div class="code-block">{jailbreak_prompt[:1000]}
{'... (truncated)' if len(jailbreak_prompt) > 1000 else ''}</div>
        </div>

        <div class="section">
            <div class="section-title">MODEL RESPONSE (PARTIAL)</div>
            <div class="code-block">{model_response[:500]}
{'... (truncated)' if len(model_response) > 500 else ''}</div>
        </div>

        <div class="section">
            <div class="section-title">RECOMMENDED ACTIONS</div>
            <ol>
                <li>Review the provided prompt injection exploit (PIE)</li>
                <li>Test the vulnerability in your internal environment</li>
                <li>Implement appropriate safety guardrails</li>
                <li>Update model training or filtering mechanisms</li>
                <li>Monitor for similar attack patterns</li>
            </ol>
        </div>

        <div class="section">
            <div class="section-title">ABOUT THIS NOTIFICATION</div>
            <p>Lupin is an AI red-teaming platform designed to test and improve AI safety. We send these
            notifications to ensure responsible disclosure and help improve the security of AI systems.</p>
            <p><em>This notification was sent in compliance with ethical disclosure practices.</em></p>
        </div>
    </div>

    <div class="footer">
        <p><strong>Lupin Red Team Platform</strong><br>
        Automated Security Notification System<br>
        For questions or to discuss this vulnerability: security@lupin-red-team.com</p>
    </div>
</body>
</html>
"""

            # Attach both text and HTML versions
            part1 = MIMEText(text_body, "plain")
            part2 = MIMEText(html_body, "html")
            msg.attach(part1)
            msg.attach(part2)

            # Send email
            if self.smtp_host and self.smtp_user and self.smtp_password:
                with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)
                logger.info(f"Email notification sent to {provider.security_email}")
                return True
            else:
                logger.warning("SMTP not configured, email notification skipped")
                return False

        except Exception as e:
            logger.error(f"Failed to send email notification: {str(e)}", exc_info=True)
            return False

    async def _send_webhook_notification(
        self,
        provider: AIProvider,
        model_name: str,
        jailbreak_prompt: str,
        model_response: str,
        attempt_id: Optional[str],
        test_run_id: Optional[str],
        exploit_id: Optional[str],
        exploit_cve_id: Optional[str],
        severity: str
    ) -> tuple[bool, str]:
        """Send webhook notification to provider's endpoint"""
        try:
            payload = {
                "event_type": "jailbreak_detected",
                "timestamp": datetime.utcnow().isoformat(),
                "severity": severity,
                "model": {
                    "name": model_name,
                    "provider": provider.provider_name
                },
                "vulnerability": {
                    "cve_id": exploit_cve_id,
                    "exploit_id": exploit_id,
                    "jailbreak_prompt": jailbreak_prompt,
                    "model_response": model_response[:1000],  # Limit response size
                },
                "metadata": {
                    "attempt_id": attempt_id,
                    "test_run_id": test_run_id,
                    "source": "lupin-red-team",
                    "notification_version": "1.0"
                }
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    provider.webhook_url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10),
                    headers={"Content-Type": "application/json"}
                ) as response:
                    response_text = await response.text()
                    if response.status in [200, 201, 202]:
                        logger.info(f"Webhook notification sent to {provider.webhook_url}")
                        return True, f"Success: {response.status} - {response_text[:200]}"
                    else:
                        logger.error(f"Webhook failed with status {response.status}: {response_text}")
                        return False, f"Failed: {response.status} - {response_text[:200]}"

        except aiohttp.ClientError as e:
            logger.error(f"Webhook request failed: {str(e)}", exc_info=True)
            return False, f"Client error: {str(e)}"
        except Exception as e:
            logger.error(f"Failed to send webhook notification: {str(e)}", exc_info=True)
            return False, f"Exception: {str(e)}"

    async def get_notification_stats(self, provider_name: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics about sent notifications"""
        query = select(JailbreakNotification)

        if provider_name:
            # Join with AIProvider to filter by provider_name
            stmt = select(JailbreakNotification).join(
                AIProvider, AIProvider.id == JailbreakNotification.provider_id
            ).where(AIProvider.provider_name == provider_name)
        else:
            stmt = select(JailbreakNotification)

        result = await self.db.execute(stmt)
        notifications = result.scalars().all()

        total = len(notifications)
        sent = sum(1 for n in notifications if n.notification_status == "sent")
        failed = sum(1 for n in notifications if n.notification_status == "failed")
        pending = sum(1 for n in notifications if n.notification_status == "pending")

        return {
            "total_notifications": total,
            "sent": sent,
            "failed": failed,
            "pending": pending,
            "success_rate": (sent / total * 100) if total > 0 else 0
        }
