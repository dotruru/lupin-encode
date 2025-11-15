import { useState, useEffect } from 'react'
import './PoliciesModal.css'

type PolicySection = 'overview' | 'terms' | 'privacy' | 'disclosure' | 'acceptable-use' | 'ethics'

interface PoliciesModalProps {
  onClose: () => void
}

export default function PoliciesModal({ onClose }: PoliciesModalProps) {
  const [activeSection, setActiveSection] = useState<PolicySection>('overview')

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="policies-modal-overlay" onClick={onClose}>
      <div className="policies-modal" onClick={(e) => e.stopPropagation()}>
        <button className="policies-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="policies-container">
          <div className="policies-sidebar">
            <button
              className={`policy-nav-button ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              Overview
            </button>
            <button
              className={`policy-nav-button ${activeSection === 'terms' ? 'active' : ''}`}
              onClick={() => setActiveSection('terms')}
            >
              Terms of Service
            </button>
            <button
              className={`policy-nav-button ${activeSection === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveSection('privacy')}
            >
              Privacy Policy
            </button>
            <button
              className={`policy-nav-button ${activeSection === 'disclosure' ? 'active' : ''}`}
              onClick={() => setActiveSection('disclosure')}
            >
              Responsible Disclosure
            </button>
            <button
              className={`policy-nav-button ${activeSection === 'acceptable-use' ? 'active' : ''}`}
              onClick={() => setActiveSection('acceptable-use')}
            >
              Acceptable Use
            </button>
            <button
              className={`policy-nav-button ${activeSection === 'ethics' ? 'active' : ''}`}
              onClick={() => setActiveSection('ethics')}
            >
              Ethics Guidelines
            </button>
          </div>

          <div className="policies-content">
            {activeSection === 'overview' && <OverviewSection />}
            {activeSection === 'terms' && <TermsSection />}
            {activeSection === 'privacy' && <PrivacySection />}
            {activeSection === 'disclosure' && <DisclosureSection />}
            {activeSection === 'acceptable-use' && <AcceptableUseSection />}
            {activeSection === 'ethics' && <EthicsSection />}
          </div>
        </div>
      </div>
    </div>
  )
}

// Import all the section components from PoliciesTab.tsx
function OverviewSection() {
  return (
    <div className="policy-section">
      <h2>Legal & Ethical Framework</h2>
      <p className="policy-updated">Last Updated: 16 November 2025</p>

      <div className="policy-alert critical">
        <h3>IMPORTANT NOTICE</h3>
        <p>LUPIN is a <strong>defensive security tool</strong> designed for authorised research and testing purposes only. By using this software, you agree to comply with all policies outlined in this section.</p>
      </div>

      <div className="policy-box">
        <h3>What LUPIN Is</h3>
        <ul>
          <li>A security research platform for testing LLM safety systems</li>
          <li>An educational tool for understanding prompt injection vulnerabilities</li>
          <li>A defensive toolkit for improving AI safety</li>
          <li>A vulnerability database (PIE Tracker) for regression testing</li>
        </ul>
      </div>

      <div className="policy-box">
        <h3>What LUPIN Is NOT</h3>
        <ul>
          <li>A tool for attacking systems without authorisation</li>
          <li>A platform for generating harmful or illegal content</li>
          <li>A means to bypass safety systems for malicious purposes</li>
          <li>A substitute for obtaining proper security testing permissions</li>
        </ul>
      </div>

      <div className="policy-grid">
        <div className="policy-card permitted">
          <h4>PERMITTED USES</h4>
          <ul>
            <li>Red-team testing your own applications</li>
            <li>Academic security research</li>
            <li>CTF competitions</li>
            <li>Regression testing during development</li>
            <li>Building defensive measures</li>
            <li>Educational purposes</li>
          </ul>
        </div>

        <div className="policy-card prohibited">
          <h4>PROHIBITED USES</h4>
          <ul>
            <li>Unauthorised system access</li>
            <li>Malicious exploitation</li>
            <li>Generating illegal content</li>
            <li>Denial-of-service attacks</li>
            <li>Mass automated attacks</li>
            <li>Violating platform terms of service</li>
          </ul>
        </div>
      </div>

      <div className="policy-responsibilities">
        <h3>Your Responsibilities</h3>
        <ol>
          <li><strong>Obtain Authorisation:</strong> Get explicit written permission before testing systems you don't own</li>
          <li><strong>Comply with Laws:</strong> Understand and follow Computer Fraud and Abuse Act (USA), Computer Misuse Act (UK), and equivalent legislation</li>
          <li><strong>Protect Data:</strong> Secure API keys and handle discovered vulnerabilities responsibly</li>
          <li><strong>Disclose Responsibly:</strong> Follow coordinated disclosure practices for vulnerabilities</li>
          <li><strong>Respect Terms:</strong> Comply with third-party API provider terms (OpenRouter, Hugging Face, GitHub)</li>
        </ol>
      </div>

      <div className="policy-disclaimer">
        <h3>Limitation of Liability</h3>
        <p>LUPIN is provided "AS IS" without warranties. CrakHaus and contributors are NOT liable for misuse, legal consequences, damages, or losses arising from your use of this software. You are solely responsible for ensuring your activities are legal and authorised.</p>
      </div>

      <div className="policy-contact">
        <h3>Questions or Concerns?</h3>
        <p>For legal, privacy, or security disclosure enquiries, please contact CrakHaus through our GitHub repository.</p>
      </div>
    </div>
  )
}

function TermsSection() {
  return (
    <div className="policy-section">
      <h2>Terms of Service</h2>
      <p className="policy-updated">Effective Date: 16 November 2025</p>

      <h3>1. Acceptance of Terms</h3>
      <p>By accessing, downloading, or using LUPIN, you agree to be bound by these Terms of Service. If you do not agree, you must not use the software.</p>

      <h3>2. Licence Grant</h3>
      <p>We grant you a limited, non-exclusive, non-transferable, revocable licence to use LUPIN for lawful security research and educational purposes, subject to these terms.</p>

      <h3>3. Restrictions</h3>
      <p>You shall NOT:</p>
      <ul>
        <li>Use LUPIN to test systems without explicit authorisation</li>
        <li>Deploy against production systems owned by third parties without written permission</li>
        <li>Use LUPIN to generate harmful, illegal, or malicious content</li>
        <li>Violate applicable laws or regulations</li>
        <li>Remove copyright notices or attributions</li>
        <li>Commercially exploit LUPIN without authorisation</li>
      </ul>

      <h3>4. Permitted Activities</h3>
      <p>LUPIN may be used for:</p>
      <ul>
        <li>Red-team security testing of systems you own or have written permission to test</li>
        <li>Academic research and cybersecurity education</li>
        <li>CTF competitions and authorised security challenges</li>
        <li>Regression testing during internal model development</li>
        <li>Building defensive measures against prompt injection</li>
      </ul>

      <h3>5. GitHub Scraper Component</h3>
      <p>The GitHub scraper functionality must:</p>
      <ul>
        <li>ONLY be used for authorised security research</li>
        <li>Comply with GitHub's Terms of Service and Acceptable Use Policies</li>
        <li>NOT harvest private repositories or unauthorised data</li>
        <li>Implement reasonable rate-limiting to avoid service disruption</li>
        <li>Respect robots.txt and API rate limits</li>
        <li>Only target publicly available information for legitimate research</li>
      </ul>

      <h3>6. User Responsibilities</h3>
      <h4>Legal Compliance:</h4>
      <ul>
        <li>Ensure compliance with all applicable laws (CFAA, Computer Misuse Act, etc.)</li>
        <li>Obtain necessary authorisations before conducting tests</li>
        <li>Accept sole responsibility for consequences of unauthorised use</li>
      </ul>

      <h4>API Key Management:</h4>
      <ul>
        <li>Securely store API keys for OpenRouter, Hugging Face, and other services</li>
        <li>Never share API keys in public repositories</li>
        <li>Monitor API usage to prevent abuse</li>
        <li>Revoke compromised keys immediately</li>
      </ul>

      <h4>Data Protection:</h4>
      <ul>
        <li>Handle discovered vulnerabilities responsibly</li>
        <li>Not publicly disclose vulnerabilities without responsible disclosure</li>
        <li>Comply with data protection regulations (GDPR, UK DPA 2018)</li>
      </ul>

      <h3>7. Third-Party Services</h3>
      <p>LUPIN integrates with OpenRouter, Hugging Face, and GitHub. You must comply with their terms of service. We are not responsible for changes to third-party services. You are responsible for API costs incurred.</p>

      <h3>8. Intellectual Property</h3>
      <p>LUPIN and all intellectual property rights remain the property of CrakHaus. You retain ownership of exploits you add, test results, and research findings. You grant us a licence to use anonymous, aggregated data for improvements.</p>

      <h3>9. Disclaimers</h3>
      <p>LUPIN is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, including merchantability, fitness for purpose, non-infringement, accuracy, or uninterrupted operation.</p>

      <h3>10. Limitation of Liability</h3>
      <p>To the maximum extent permitted by law, CrakHaus shall NOT be liable for any direct, indirect, incidental, consequential, or punitive damages, loss of data or profits, system downtime, unauthorised access, or legal consequences from your use.</p>

      <h3>11. Indemnification</h3>
      <p>You agree to indemnify and hold harmless CrakHaus from any claims, damages, losses, or expenses arising from your use or misuse of LUPIN, violation of these terms, or violation of applicable laws.</p>

      <h3>12. Termination</h3>
      <p>We reserve the right to terminate your access immediately if you violate these terms, use LUPIN illegally, engage in harmful activities, or fail to comply with responsible disclosure obligations.</p>

      <h3>13. Governing Law</h3>
      <p>These terms are governed by the laws of England and Wales. Disputes shall be subject to the exclusive jurisdiction of English and Welsh courts.</p>

      <h3>14. Changes to Terms</h3>
      <p>We may modify these terms at any time. Material changes will be announced via GitHub and the software interface. Continued use after changes constitutes acceptance.</p>

      <h3>15. Contact</h3>
      <p>For questions regarding these terms, please contact CrakHaus via our GitHub repository.</p>
    </div>
  )
}

// Import PrivacySection, DisclosureSection, AcceptableUseSection, EthicsSection
// (These are the same as in PoliciesTab.tsx - copying them here for completeness)

function PrivacySection() {
  return (
    <div className="policy-section">
      <h2>Privacy Policy</h2>
      <p className="policy-updated">Effective Date: 16 November 2025</p>
      <p className="policy-subtitle">Compliant with GDPR (EU) 2016/679 and UK Data Protection Act 2018</p>

      <h3>1. Information We Collect</h3>

      <h4>Locally Stored Data:</h4>
      <p>LUPIN operates as a local application. The following is stored on your device:</p>
      <ul>
        <li>Jailbreak prompts and test attempts (text, timestamps)</li>
        <li>PIE (Prompt Injection Exploit) database entries</li>
        <li>Regression test results and safety scores</li>
        <li>Configuration settings and preferences</li>
        <li>API keys for third-party services</li>
        <li>Agent notepad drafts</li>
      </ul>

      <h4>User-Supplied Information:</h4>
      <ul>
        <li>API keys (OpenRouter, Hugging Face, GitHub)</li>
        <li>Target model identifiers</li>
        <li>Custom exploit entries</li>
        <li>Test parameters and configurations</li>
      </ul>

      <h4>Information We Do NOT Collect:</h4>
      <ul>
        <li>Personal identification (name, address, phone)</li>
        <li>Email addresses (unless you contact us)</li>
        <li>Payment information</li>
        <li>Location data</li>
        <li>Usage analytics or telemetry</li>
        <li>Browser fingerprints or tracking cookies</li>
      </ul>

      <h3>2. How We Use Your Information</h3>

      <h4>Local Processing:</h4>
      <p>All data processing occurs locally on your device. We do NOT transmit your data to our servers.</p>

      <h4>Third-Party API Calls:</h4>
      <p>When using LUPIN features, data is transmitted to:</p>
      <ul>
        <li><strong>OpenRouter:</strong> Prompts, model identifiers, API keys (Privacy: https://openrouter.ai/privacy)</li>
        <li><strong>Hugging Face:</strong> Search queries, API keys (Privacy: https://huggingface.co/privacy)</li>
        <li><strong>GitHub:</strong> HTTP requests for public data (Privacy: https://docs.github.com/en/site-policy/privacy-policies)</li>
      </ul>

      <h3>3. Data Storage and Security</h3>

      <h4>Local Storage:</h4>
      <p>Database location: <code>/backend/lupin.db</code> in your installation directory.</p>
      <p>Contains exploits, test runs, and configurations. Only accessible locally on your device.</p>

      <h4>Security Recommendations:</h4>
      <ul>
        <li>API keys are stored in your local database (not encrypted by default)</li>
        <li>We recommend encrypting your storage drive</li>
        <li>Never commit API keys to version control</li>
        <li>Use environment variables or secure key management</li>
        <li>Rotate API keys regularly</li>
      </ul>

      <h4>Data Retention:</h4>
      <p>Data persists until you manually delete it. Delete the database file to remove all records. Individual entries can be removed through the UI.</p>

      <h3>4. Your Rights Under GDPR and UK DPA</h3>

      <ul>
        <li><strong>Right to Access:</strong> Access all data in the SQLite database using the UI or database tools</li>
        <li><strong>Right to Rectification:</strong> Edit exploit entries and test data through the UI</li>
        <li><strong>Right to Erasure:</strong> Delete individual records or the entire database</li>
        <li><strong>Right to Data Portability:</strong> Export database as JSON/CSV (planned feature) or use SQLite tools</li>
        <li><strong>Right to Restriction:</strong> Control all data usage since processing is local</li>
        <li><strong>Right to Object:</strong> Stop using LUPIN to cease processing</li>
      </ul>

      <h3>5. Third-Party Services</h3>
      <p>We do NOT share your data with third parties, except when you explicitly direct the software to make API calls to configured services, or as required by law.</p>

      <p>Third-party services have their own privacy policies. Review:</p>
      <ul>
        <li>OpenRouter: https://openrouter.ai/privacy</li>
        <li>Hugging Face: https://huggingface.co/privacy</li>
        <li>GitHub: https://docs.github.com/en/site-policy/privacy-policies</li>
      </ul>

      <h3>6. Children's Privacy</h3>
      <p>LUPIN is not intended for individuals under 18. We do not knowingly collect information from children.</p>

      <h3>7. International Data Transfers</h3>
      <p>LUPIN processes data locally. Third-party APIs may transfer data internationally - review their policies for details.</p>

      <h3>8. Cookies and Tracking</h3>
      <p>LUPIN does NOT use cookies, analytics, advertising, or fingerprinting. The web interface may use browser localStorage for UI preferences only.</p>

      <h3>9. Data Breach Notification</h3>
      <p>Since we do not operate servers or collect user data, we cannot experience a breach of your information. Your data security depends on your local device security.</p>

      <p>If API keys are compromised, immediately revoke them and notify the API provider.</p>

      <h3>10. Supervisory Authority</h3>
      <p>UK: Information Commissioner's Office (ICO) - https://ico.org.uk - 0303 123 1113</p>
      <p>EU: Contact your local Data Protection Authority - https://edpb.europa.eu</p>

      <h3>11. Contact</h3>
      <p>For privacy enquiries, contact CrakHaus via our GitHub repository with "Privacy Policy" in the subject.</p>
    </div>
  )
}

function DisclosureSection() {
  return (
    <div className="policy-section">
      <h2>Responsible Disclosure Policy</h2>
      <p className="policy-updated">Effective Date: 16 November 2025</p>

      <h3>Overview</h3>
      <p>This policy establishes guidelines for ethical and lawful disclosure of security vulnerabilities discovered using LUPIN or within LUPIN itself.</p>

      <h3>Core Principles</h3>

      <h4>1. Authorisation</h4>
      <ul>
        <li>Only test systems you own or have explicit written permission to test</li>
        <li>Obtain authorisation BEFORE conducting security research</li>
        <li>Document all permissions</li>
      </ul>

      <h4>2. Proportionality</h4>
      <ul>
        <li>Limit testing to minimum necessary to verify vulnerabilities</li>
        <li>Avoid actions that could cause harm, disruption, or data loss</li>
        <li>Do not exfiltrate sensitive data beyond proof-of-concept needs</li>
        <li>Respect system resources - avoid denial-of-service</li>
      </ul>

      <h4>3. Responsible Reporting</h4>
      <ul>
        <li>Report vulnerabilities promptly to affected parties</li>
        <li>Provide reasonable time for remediation before public disclosure</li>
        <li>Follow coordinated disclosure timelines (typically 90 days)</li>
        <li>Protect sensitive information during disclosure</li>
      </ul>

      <h3>Disclosure Process for LLM Vulnerabilities</h3>

      <h4>Step 1: Document (Day 0)</h4>
      <ul>
        <li>Record exploit prompt and technique</li>
        <li>Document affected models and versions</li>
        <li>Note severity and potential impact</li>
        <li>Capture proof-of-concept</li>
      </ul>

      <h4>Step 2: Assess Severity (Day 0-1)</h4>
      <ul>
        <li><strong>Critical:</strong> Complete safety bypass, illegal content generation</li>
        <li><strong>High:</strong> Significant guardrail bypass, data exposure</li>
        <li><strong>Medium:</strong> Partial bypass, limited unauthorised actions</li>
        <li><strong>Low:</strong> Minor inconsistencies, theoretical vulnerabilities</li>
      </ul>

      <h4>Step 3: Identify Affected Parties (Day 1-2)</h4>
      <ul>
        <li>Model developer (Anthropic, OpenAI, Meta, etc.)</li>
        <li>Hosting platform (OpenRouter, Hugging Face)</li>
        <li>Application developers using the model</li>
      </ul>

      <h4>Step 4: Prepare Report (Day 2-5)</h4>
      <p>Include:</p>
      <ul>
        <li>Summary and severity rating</li>
        <li>Technical details and reproduction steps</li>
        <li>Impact assessment</li>
        <li>Proof of concept</li>
        <li>Remediation recommendations</li>
        <li>Proposed disclosure timeline</li>
      </ul>

      <h4>Step 5: Initial Notification (Day 5-7)</h4>
      <p>Contact vendors through official security channels:</p>
      <ul>
        <li>Anthropic: security@anthropic.com</li>
        <li>OpenAI: security@openai.com</li>
        <li>Google DeepMind: https://bughunters.google.com</li>
        <li>Meta: https://www.facebook.com/whitehat</li>
      </ul>

      <h4>Step 6: Coordinated Disclosure (Day 7+)</h4>
      <p>Standard timeline:</p>
      <ul>
        <li>Day 0: Vulnerability discovered</li>
        <li>Day 7: Initial vendor notification</li>
        <li>Day 14: Vendor acknowledgement expected</li>
        <li>Day 30: Status update from vendor</li>
        <li>Day 90: Default public disclosure date</li>
      </ul>

      <h4>Step 7: Public Disclosure</h4>
      <p>After embargo period or vendor confirmation of remediation:</p>
      <ul>
        <li>Research blog post with technical details</li>
        <li>PIE database entry</li>
        <li>Security mailing lists</li>
        <li>Academic publications or conference talks</li>
      </ul>

      <h3>Reporting Vulnerabilities in LUPIN</h3>

      <p>If you discover a security vulnerability in LUPIN software:</p>
      <ul>
        <li><strong>DO NOT</strong> create a public GitHub issue</li>
        <li>Contact CrakHaus privately via GitHub security advisory</li>
        <li>Provide detailed reproduction steps and impact assessment</li>
        <li>We commit to 24-hour acknowledgement, 7-day assessment, 30-day patch for High/Critical issues</li>
      </ul>

      <h3>Ethical Considerations</h3>

      <h4>DO:</h4>
      <ul>
        <li>Act in good faith to improve security</li>
        <li>Provide clear, actionable reports</li>
        <li>Maintain confidentiality during remediation</li>
        <li>Follow industry-standard practices</li>
        <li>Respect embargo periods</li>
      </ul>

      <h4>DO NOT:</h4>
      <ul>
        <li>Exploit vulnerabilities for personal gain</li>
        <li>Publicly disclose before remediation</li>
        <li>Demand payment or ransom</li>
        <li>Access more data than necessary</li>
        <li>Disrupt services or damage systems</li>
      </ul>

      <h3>Active Exploitation</h3>
      <p>If a vulnerability is actively exploited in the wild:</p>
      <ul>
        <li>Contact vendor immediately (within 24 hours)</li>
        <li>Escalate severity to critical</li>
        <li>Accelerated timeline (7-14 days for disclosure)</li>
        <li>Consider early public disclosure if exploitation is widespread</li>
        <li>Work with national CERTs and security organisations</li>
      </ul>

      <h3>Legal Protections and Safe Harbour</h3>
      <p>CrakHaus will NOT pursue legal action against researchers who:</p>
      <ul>
        <li>Act in good faith</li>
        <li>Follow this responsible disclosure policy</li>
        <li>Report vulnerabilities promptly</li>
        <li>Do not cause harm or access sensitive data unnecessarily</li>
        <li>Comply with applicable laws</li>
      </ul>

      <p><strong>This policy does NOT grant permission to test third-party systems without authorisation or violate laws.</strong></p>

      <h3>Recognition</h3>
      <p>We maintain a security hall of fame for responsible disclosures. Contributors receive credit in release notes, security advisories, and public announcements.</p>
    </div>
  )
}

function AcceptableUseSection() {
  return (
    <div className="policy-section">
      <h2>Acceptable Use Policy</h2>
      <p className="policy-updated">Effective Date: 16 November 2025</p>

      <div className="policy-alert critical">
        <h3>CRITICAL NOTICE</h3>
        <p>Violation of this Acceptable Use Policy may result in immediate termination of access, legal consequences, and liability for damages.</p>
      </div>

      <h3>Permitted Uses</h3>

      <h4>Authorised Security Testing:</h4>
      <ul>
        <li>Red-team testing systems you own</li>
        <li>Security assessments with documented written permission</li>
        <li>Penetration testing within scope of engagement contracts</li>
        <li>Regression testing your own models during development</li>
      </ul>

      <h4>Research and Education:</h4>
      <ul>
        <li>Academic research in AI safety and cybersecurity</li>
        <li>Educational demonstrations in classroom settings</li>
        <li>Security training and awareness programmes</li>
        <li>Publishing responsible research findings</li>
      </ul>

      <h4>Defensive Security:</h4>
      <ul>
        <li>Building detection and prevention systems</li>
        <li>Developing mitigations against prompt injection</li>
        <li>Testing effectiveness of safety guardrails you've implemented</li>
        <li>Creating defensive security tools</li>
      </ul>

      <h4>Competitions:</h4>
      <ul>
        <li>Capture the Flag (CTF) events</li>
        <li>Bug bounty programmes (following their rules)</li>
        <li>Authorised security challenges</li>
        <li>Red team vs. blue team exercises</li>
      </ul>

      <h3>Prohibited Uses</h3>

      <h4>Unauthorised Access:</h4>
      <ul>
        <li>Testing systems without explicit written permission</li>
        <li>Attacking production environments of third parties</li>
        <li>Accessing data or systems beyond authorised scope</li>
        <li>Bypassing authentication or authorisation controls</li>
      </ul>

      <h4>Harmful Content Generation:</h4>
      <ul>
        <li>Generating illegal content (CSAM, terrorism, violence)</li>
        <li>Creating malware, ransomware, or harmful code</li>
        <li>Producing content that violates laws or regulations</li>
        <li>Generating harassment, abuse, or hate speech</li>
      </ul>

      <h4>Malicious Activities:</h4>
      <ul>
        <li>Denial-of-service (DoS) attacks or resource exhaustion</li>
        <li>Automated mass exploitation without authorisation</li>
        <li>Data exfiltration beyond proof-of-concept requirements</li>
        <li>Intentional system damage or service disruption</li>
      </ul>

      <h4>Violations of Third-Party Terms:</h4>
      <ul>
        <li>Violating GitHub Terms of Service or Acceptable Use Policies</li>
        <li>Breaching OpenRouter usage guidelines</li>
        <li>Exceeding API rate limits or usage quotas maliciously</li>
        <li>Scraping private repositories or unauthorised data</li>
      </ul>

      <h4>Illegal Activities:</h4>
      <ul>
        <li>Violating Computer Fraud and Abuse Act (USA)</li>
        <li>Violating Computer Misuse Act 1990 (UK)</li>
        <li>Breaching GDPR, DPA 2018, or data protection laws</li>
        <li>Infringing intellectual property rights</li>
        <li>Money laundering, fraud, or financial crimes</li>
      </ul>

      <h3>GitHub Scraper Specific Rules</h3>

      <h4>Permitted GitHub Scraper Use:</h4>
      <ul>
        <li>Researching publicly available security vulnerabilities</li>
        <li>Academic research on exposed secrets (with responsible disclosure)</li>
        <li>Educational demonstrations of security risks</li>
        <li>Defensive research to improve secret detection</li>
      </ul>

      <h4>Prohibited GitHub Scraper Use:</h4>
      <ul>
        <li>Harvesting secrets for unauthorised access</li>
        <li>Exploiting discovered credentials</li>
        <li>Scraping private repositories</li>
        <li>Bypassing GitHub rate limits or access controls</li>
        <li>Mass automated scraping that disrupts services</li>
        <li>Using discovered secrets without notifying repository owners</li>
      </ul>

      <h3>API Key Usage</h3>

      <h4>Required Practices:</h4>
      <ul>
        <li>Use only API keys you own or are authorised to use</li>
        <li>Store keys securely (never in version control)</li>
        <li>Monitor API usage for unauthorised activity</li>
        <li>Rotate keys regularly</li>
        <li>Revoke compromised keys immediately</li>
        <li>Comply with API provider rate limits and quotas</li>
      </ul>

      <h4>Prohibited Practices:</h4>
      <ul>
        <li>Using stolen or unauthorised API keys</li>
        <li>Sharing API keys publicly</li>
        <li>Exceeding rate limits maliciously</li>
        <li>Using keys in violation of provider terms</li>
      </ul>

      <h3>Data Handling</h3>

      <h4>Responsible Practices:</h4>
      <ul>
        <li>Minimise data collection to proof-of-concept needs</li>
        <li>Secure sensitive information discovered during testing</li>
        <li>Delete data when no longer needed for research</li>
        <li>Follow responsible disclosure for vulnerabilities</li>
        <li>Comply with GDPR, DPA 2018, and data protection laws</li>
      </ul>

      <h4>Prohibited Practices:</h4>
      <ul>
        <li>Exfiltrating personal data without authorisation</li>
        <li>Publicly disclosing vulnerabilities before remediation</li>
        <li>Selling or trading discovered data or credentials</li>
        <li>Retaining sensitive data beyond research requirements</li>
      </ul>

      <h3>Enforcement</h3>

      <h4>Violations May Result In:</h4>
      <ul>
        <li>Immediate termination of licence and access</li>
        <li>Notification to affected parties and authorities</li>
        <li>Legal action for damages</li>
        <li>Criminal prosecution (depending on severity)</li>
        <li>Civil liability for harm caused</li>
      </ul>

      <h4>Reporting Violations:</h4>
      <p>If you become aware of LUPIN being used in violation of this policy:</p>
      <ul>
        <li>Report to CrakHaus via GitHub</li>
        <li>Notify affected parties if safe to do so</li>
        <li>Contact appropriate authorities if illegal activity is suspected</li>
      </ul>

      <h3>Your Legal Obligations</h3>

      <h4>Key Laws to Understand:</h4>
      <ul>
        <li><strong>USA:</strong> Computer Fraud and Abuse Act (CFAA), 18 U.S.C. § 1030</li>
        <li><strong>UK:</strong> Computer Misuse Act 1990, Police and Justice Act 2006</li>
        <li><strong>EU/UK:</strong> GDPR (EU) 2016/679, UK Data Protection Act 2018</li>
        <li><strong>Your Jurisdiction:</strong> Research applicable cybersecurity laws</li>
      </ul>

      <h4>Remember:</h4>
      <ul>
        <li>Ignorance of the law is not a defence</li>
        <li>Authorisation must be explicit and documented</li>
        <li>"White hat" intentions do not exempt you from liability</li>
        <li>Violating terms of service can have legal consequences</li>
      </ul>

      <h3>Changes to This Policy</h3>
      <p>We may update this policy to reflect legal requirements, security best practices, or lessons learned. Continued use after updates constitutes acceptance.</p>

      <h3>Questions</h3>
      <p>If uncertain whether an activity is permitted, contact CrakHaus BEFORE proceeding. When in doubt, don't do it.</p>
    </div>
  )
}

function EthicsSection() {
  return (
    <div className="policy-section">
      <h2>Ethics Guidelines for Security Research</h2>
      <p className="policy-updated">Effective Date: 16 November 2025</p>

      <h3>Our Commitment to Ethical Security Research</h3>
      <p>LUPIN is built on the foundation that security research must be conducted ethically, responsibly, and with respect for individuals, organisations, and society. These guidelines establish our ethical framework.</p>

      <h3>Core Ethical Principles</h3>

      <h4>1. Do No Harm</h4>
      <ul>
        <li>Prioritise safety and minimise risk to systems and people</li>
        <li>Avoid actions that could cause disruption, data loss, or harm</li>
        <li>Consider downstream consequences of your research</li>
        <li>Protect vulnerable populations from exploitation</li>
      </ul>

      <h4>2. Respect Autonomy</h4>
      <ul>
        <li>Obtain informed consent before testing systems</li>
        <li>Respect system owners' rights and decisions</li>
        <li>Honour embargo periods and disclosure agreements</li>
        <li>Provide meaningful choice about participation in research</li>
      </ul>

      <h4>3. Act with Integrity</h4>
      <ul>
        <li>Be honest and transparent about your methods and findings</li>
        <li>Give credit to others' work appropriately</li>
        <li>Admit mistakes and correct misinformation</li>
        <li>Avoid conflicts of interest or disclose them clearly</li>
      </ul>

      <h4>4. Promote Justice</h4>
      <ul>
        <li>Ensure research benefits are distributed fairly</li>
        <li>Avoid exploiting power imbalances</li>
        <li>Support underrepresented researchers and communities</li>
        <li>Consider societal impacts of your work</li>
      </ul>

      <h4>5. Foster Public Good</h4>
      <ul>
        <li>Contribute to collective security knowledge</li>
        <li>Share findings responsibly to improve safety</li>
        <li>Support defensive security efforts</li>
        <li>Promote awareness and education</li>
      </ul>

      <h3>Ethical Decision-Making Framework</h3>

      <h4>Before Conducting Research, Ask:</h4>
      <ol>
        <li><strong>Authorisation:</strong> Do I have explicit permission?</li>
        <li><strong>Necessity:</strong> Is this test necessary to prove the vulnerability?</li>
        <li><strong>Proportionality:</strong> Am I using the minimum intrusive methods?</li>
        <li><strong>Risk:</strong> What could go wrong and how severe would it be?</li>
        <li><strong>Benefit:</strong> Who benefits from this research and how?</li>
        <li><strong>Alternatives:</strong> Are there less risky ways to achieve the goal?</li>
        <li><strong>Transparency:</strong> Can I disclose my methods and findings responsibly?</li>
        <li><strong>Reversibility:</strong> Can I undo any changes if something goes wrong?</li>
      </ol>

      <h4>If Unsure:</h4>
      <ul>
        <li>Consult with peers, mentors, or ethics committees</li>
        <li>Err on the side of caution</li>
        <li>Seek explicit permission rather than assuming</li>
        <li>Document your ethical reasoning</li>
      </ul>

      <h3>Continuous Ethical Reflection</h3>

      <h4>Regularly Ask Yourself:</h4>
      <ul>
        <li>Am I proud of how I'm conducting this research?</li>
        <li>Would I be comfortable if my methods were public knowledge?</li>
        <li>Am I treating others as I would want to be treated?</li>
        <li>Is my research making the world more secure or less?</li>
        <li>Am I living up to the trust placed in security researchers?</li>
      </ul>

      <h3>Contact</h3>
      <p>For ethical questions or guidance, contact CrakHaus via our GitHub repository or consult with cybersecurity ethics experts in your organisation or academic institution.</p>

      <div className="policy-quote">
        <p>"With great power comes great responsibility. As security researchers, we have the skills to find vulnerabilities that others cannot. We must use those skills wisely, ethically, and for the benefit of all."</p>
        <p className="quote-author">— The CrakHaus Team</p>
      </div>
    </div>
  )
}
