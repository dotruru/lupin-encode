# Responsible Disclosure Policy

**Last Updated:** 14 November 2025
**Effective Date:** 14 November 2025

## 1. Overview

This Responsible Disclosure Policy establishes guidelines for the ethical and lawful disclosure of security vulnerabilities discovered using LUPIN or within LUPIN itself.

CrakHaus is committed to:
- Promoting responsible security research
- Protecting users and organisations from harm
- Supporting the cybersecurity community
- Ensuring legal compliance in vulnerability disclosure

## 2. Scope

This policy applies to:
- Vulnerabilities discovered using LUPIN's jailbreak agent or PIE tracker
- Security issues found in LUPIN's codebase
- Prompt injection exploits discovered through security research
- LLM safety bypasses identified during testing
- Weaknesses in third-party systems discovered during authorised testing

## 3. Core Principles of Responsible Disclosure

### 3.1 The Three Pillars

**1. Authorisation**
- Only test systems you own or have explicit written permission to test
- Obtain authorisation BEFORE conducting security research
- Document all permissions and maintain evidence of authorisation

**2. Proportionality**
- Limit testing to the minimum necessary to verify vulnerabilities
- Avoid actions that could cause harm, disruption, or data loss
- Do not exfiltrate sensitive data beyond what's necessary for proof-of-concept
- Respect system resources and avoid denial-of-service conditions

**3. Responsible Reporting**
- Report vulnerabilities promptly to affected parties
- Provide reasonable time for remediation before public disclosure
- Follow coordinated disclosure timelines
- Protect sensitive information during the disclosure process

### 3.2 Ethical Considerations

**Do:**
- ✅ Act in good faith to improve security
- ✅ Provide clear, actionable vulnerability reports
- ✅ Maintain confidentiality during remediation periods
- ✅ Follow industry-standard disclosure practices
- ✅ Respect embargo periods and coordinated disclosure
- ✅ Acknowledge researchers and organisations appropriately

**Do Not:**
- ❌ Exploit vulnerabilities for personal gain or malicious purposes
- ❌ Publicly disclose vulnerabilities before remediation
- ❌ Demand payment or ransom for vulnerability information
- ❌ Access more data than necessary to demonstrate the issue
- ❌ Disrupt services or damage systems during testing
- ❌ Violate laws or regulations in pursuit of research

## 4. Disclosure Process for LLM Vulnerabilities

### 4.1 Discovering Prompt Injection Exploits

When you discover a new PIE (Prompt Injection Exploit) using LUPIN:

**Step 1: Document the Vulnerability (Day 0)**
- Record the exploit prompt and technique
- Document affected models and versions
- Note the severity and potential impact
- Capture proof-of-concept demonstrations
- Assess whether the vulnerability is already public knowledge

**Step 2: Assess Severity (Day 0-1)**

Use this classification system:

| Severity | Criteria | Example |
|----------|----------|---------|
| **Critical** | Complete safety bypass, enables illegal content generation, system compromise | Jailbreak allowing unrestricted harmful content |
| **High** | Significant guardrail bypass, sensitive data exposure, privilege escalation | Extraction of training data, system prompt disclosure |
| **Medium** | Partial safety bypass, information disclosure, limited unauthorised actions | Subtle instruction override, minor policy violations |
| **Low** | Minor inconsistencies, edge cases, theoretical vulnerabilities | Unusual responses without harmful output |

**Step 3: Identify Affected Parties (Day 1-2)**
- Model developer/provider (e.g., Anthropic, OpenAI, Meta)
- Hosting platform (e.g., OpenRouter, Hugging Face)
- Application developers using the affected model
- Potentially impacted end users

**Step 4: Prepare Disclosure Report (Day 2-5)**

Your report should include:

```
VULNERABILITY DISCLOSURE REPORT

1. SUMMARY
   - Brief description of the vulnerability
   - Affected models and versions
   - Severity rating (Critical/High/Medium/Low)

2. TECHNICAL DETAILS
   - Exploit prompt or technique
   - Step-by-step reproduction instructions
   - Expected vs. actual behaviour
   - Root cause analysis (if known)

3. IMPACT ASSESSMENT
   - Potential harm or misuse scenarios
   - Scope of affected systems
   - Mitigating factors (if any)

4. PROOF OF CONCEPT
   - Demonstration of the vulnerability
   - Screenshots or logs (sanitised)
   - Test environment details

5. RECOMMENDATIONS
   - Suggested remediation approaches
   - Temporary mitigations or workarounds
   - Long-term fixes

6. TIMELINE
   - Date of discovery
   - Proposed disclosure timeline
   - Embargo period (typically 90 days)

7. RESEARCHER INFORMATION
   - Your contact details
   - PGP key for encrypted communication
   - Acknowledgement preferences
```

**Step 5: Initial Notification (Day 5-7)**

Contact the affected vendor through official security channels:

**Major LLM Providers:**
- **Anthropic**: security@anthropic.com
- **OpenAI**: security@openai.com
- **Google (DeepMind)**: https://bughunters.google.com
- **Meta**: https://www.facebook.com/whitehat
- **Mistral AI**: security@mistral.ai

**Bug Bounty Platforms:**
- HackerOne: https://hackerone.com
- Bugcrowd: https://bugcrowd.com
- Intigriti: https://intigriti.com

**Step 6: Coordinated Disclosure (Day 7 onwards)**

**Standard Timeline:**
- **Day 0**: Vulnerability discovered
- **Day 7**: Initial vendor notification
- **Day 14**: Vendor acknowledgement (expected)
- **Day 30**: Status update from vendor
- **Day 90**: Default public disclosure date (if no critical circumstances)
- **Flexible**: Extended embargo for complex vulnerabilities

**Vendor Response Scenarios:**

*Scenario A: Vendor is Responsive*
- Work collaboratively on remediation
- Agree on disclosure timeline
- Coordinate public announcement
- Request acknowledgement in security advisories

*Scenario B: Vendor is Unresponsive (After 14 Days)*
- Send follow-up notification
- Attempt alternative contact channels
- Document all communication attempts
- Consider involving CERT/CC or national CERT

*Scenario C: Vendor Requests Extended Embargo*
- Evaluate justification (complexity, dependencies, etc.)
- Negotiate reasonable extension (typically 30-60 additional days)
- Document agreed timeline in writing
- Set firm deadline for public disclosure

*Scenario D: Vendor Disputes Severity or Impact*
- Provide additional evidence if requested
- Consider third-party validation
- Document disagreement professionally
- Proceed with disclosure at agreed timeline

**Step 7: Public Disclosure**

When the embargo period ends or vendor confirms remediation:

**Disclosure Channels:**
- Research blog post with technical details
- CVE or PIE database entry
- Security mailing lists (e.g., oss-security)
- Academic publications or conference talks
- Your LUPIN PIE database (for community benefit)

**Disclosure Content:**
- Full technical details of the vulnerability
- Timeline of discovery and disclosure process
- Acknowledgement of vendor's cooperation (if applicable)
- Remediation status and mitigations
- Credit to all researchers involved

### 4.2 Adding to PIE Database

After responsible disclosure:

**Update LUPIN Database:**
1. Add the PIE entry with unique identifier (e.g., PIE-2025-001)
2. Document severity, affected models, and disclosure date
3. Include exploit details (if publicly disclosed or after embargo)
4. Note remediation status and patches
5. Share with the security research community

**Benefits:**
- Regression testing for future model versions
- Historical record of vulnerability patterns
- Educational resource for security research
- Contribution to AI safety knowledge base

## 5. Reporting Vulnerabilities in LUPIN

### 5.1 Security Issues in LUPIN Software

If you discover a security vulnerability in LUPIN itself:

**Reporting Process:**

**Step 1: Private Notification**
- **DO NOT** create a public GitHub issue
- Email: security@[your-domain] or [security-email]
- Subject: "LUPIN Security Vulnerability Report"
- Use PGP encryption for sensitive details (key: [PGP key ID])

**Step 2: Provide Details**
```
LUPIN VULNERABILITY REPORT

1. Vulnerability Type:
   (e.g., code injection, authentication bypass, data exposure)

2. Affected Component:
   (e.g., backend API, frontend UI, database, scraper)

3. Affected Versions:
   (e.g., v1.0.0, all versions, commit hash)

4. Reproduction Steps:
   1. ...
   2. ...
   3. ...

5. Impact:
   (What can an attacker do with this vulnerability?)

6. Suggested Fix:
   (Optional but appreciated)

7. Proof of Concept:
   (Code, screenshots, or demonstration)
```

**Step 3: Our Response Commitment**
- **24 hours**: Initial acknowledgement
- **7 days**: Preliminary assessment and severity classification
- **30 days**: Patch development and testing (for High/Critical)
- **90 days**: Maximum timeline for public disclosure

**Step 4: Coordinated Release**
- We will work with you on disclosure timing
- Credit will be provided in release notes and advisories
- We may request CVE assignment for significant vulnerabilities
- Public acknowledgement according to your preferences

### 5.2 Security Acknowledgements

We maintain a security hall of fame for researchers who responsibly disclose vulnerabilities. Contributors will be credited in:
- SECURITY.md file in the repository
- Release notes and changelogs
- Security advisories
- Public announcements (with permission)

## 6. Legal Protections and Safe Harbour

### 6.1 Our Commitment

CrakHaus will NOT pursue legal action against security researchers who:
- Act in good faith
- Follow this Responsible Disclosure Policy
- Report vulnerabilities promptly and responsibly
- Do not cause harm or access sensitive data beyond what's necessary
- Comply with applicable laws and regulations

### 6.2 Safe Harbour Provisions

We support safe harbour protections for:
- Testing LUPIN's security within reasonable bounds
- Accessing your own LUPIN instance for research
- Reporting vulnerabilities through proper channels
- Public disclosure after appropriate embargo periods

### 6.3 Legal Disclaimer

This policy does NOT grant permission to:
- Test third-party systems without authorisation
- Violate laws or regulations in your jurisdiction
- Access systems beyond what you own or have permission to test
- Cause harm to individuals, organisations, or infrastructure

**Your Responsibilities:**
- Comply with Computer Fraud and Abuse Act (USA)
- Comply with Computer Misuse Act (UK)
- Comply with equivalent legislation in your jurisdiction
- Obtain appropriate authorisations before testing
- Respect terms of service of third-party platforms

## 7. Coordination with Third Parties

### 7.1 Multi-Party Vulnerabilities

If a vulnerability affects multiple vendors:

**Coordinated Disclosure:**
1. Identify all affected parties
2. Notify all vendors simultaneously
3. Coordinate disclosure timeline across vendors
4. Set unified public disclosure date
5. Consider involving CERT/CC for coordination

**CERT/CC Coordination:**
- Website: https://www.kb.cert.org/vuls
- For complex, multi-vendor vulnerabilities
- Provides neutral third-party coordination
- Assists with CVE assignment

### 7.2 Academic and Conference Disclosure

**If publishing research:**
- Ensure embargo periods have expired
- Obtain vendor approval for early disclosure (if needed)
- Redact sensitive details if vulnerability is not fully patched
- Credit vendors for cooperative remediation
- Make research available to community after publication

**Conference Timelines:**
- Submit abstracts only after vendor notification
- Coordinate presentation dates with disclosure timeline
- Offer vendors opportunity to present joint talks
- Respect conference confidentiality during review

## 8. Handling Active Exploitation

### 8.1 Zero-Day Exploitation

If you discover a vulnerability that is actively being exploited:

**Immediate Actions:**
1. **Expedited Notification**: Contact vendor immediately (within 24 hours)
2. **Escalate Severity**: Mark as critical and request urgent response
3. **Document Evidence**: Capture indicators of exploitation
4. **Limited Disclosure**: Share only with trusted parties
5. **Accelerated Timeline**: Disclosure within 7-14 days may be necessary

**Public Safety Considerations:**
- Balance responsible disclosure with public safety
- Consider early public disclosure if exploitation is widespread
- Provide mitigations and detection methods
- Work with industry CERTs and security organisations

### 8.2 Emergency Disclosure

In exceptional circumstances (widespread harm, critical infrastructure, life safety):
- Public disclosure may be necessary before vendor remediation
- Document decision-making process
- Notify vendor immediately before public disclosure
- Provide actionable mitigations
- Work with national cybersecurity authorities

## 9. Rewards and Recognition

### 9.1 Bug Bounty

Currently, LUPIN does not operate a formal bug bounty programme. However:
- We deeply appreciate responsible disclosures
- Significant vulnerabilities may be eligible for rewards (discretionary)
- Public acknowledgement and credit provided
- Swag and merchandise for notable contributions (if available)

### 9.2 Recognition

**Hall of Fame:**
We maintain a security researchers hall of fame in SECURITY.md.

**CVE Credit:**
For vulnerabilities receiving CVE assignments, you will be credited as the discoverer.

**Public Thanks:**
- Twitter/social media acknowledgements
- Conference shout-outs
- Blog post credits

## 10. Resources and Guidelines

### 10.1 Industry Standards

**Recommended Reading:**
- ISO/IEC 29147: Vulnerability Disclosure
- NIST SP 800-40: Creating a Patch and Vulnerability Management Program
- CERT Guide to Coordinated Vulnerability Disclosure
- NCSC Vulnerability Reporting (UK)

**Disclosure Platforms:**
- HackerOne: https://hackerone.com
- Bugcrowd: https://bugcrowd.com
- GitHub Security Advisories: https://github.com/security/advisories

### 10.2 Legal Resources

**Understanding Legal Frameworks:**
- Electronic Frontier Foundation (EFF): https://eff.org/coders
- UK NCSC: https://ncsc.gov.uk/information/vulnerability-reporting
- US CISA Vulnerability Disclosure: https://cisa.gov/coordinated-vulnerability-disclosure

## 11. Contact Information

**For Security Disclosures:**
- **Email**: security@[your-domain] or [security-email]
- **PGP Key**: [Key ID and fingerprint]
- **GitHub**: @[your-github] (for LUPIN software issues only)

**For General Enquiries:**
- **Email**: [general-contact-email]
- **GitHub Issues**: https://github.com/[your-repo]/issues (non-security only)

**Response Times:**
- Initial acknowledgement: 24-48 hours
- Preliminary assessment: 7 days
- Regular updates: Every 14 days during remediation

## 12. Amendments

This policy may be updated to reflect:
- Changes in industry best practices
- Legal or regulatory requirements
- Feedback from the security community
- Lessons learned from disclosure processes

**Last Updated:** See date at top of document

## 13. Acknowledgement

BY CONDUCTING SECURITY RESEARCH RELATED TO LUPIN OR USING LUPIN FOR VULNERABILITY DISCOVERY, YOU AGREE TO FOLLOW THIS RESPONSIBLE DISCLOSURE POLICY.

Thank you for helping make LUPIN and the broader LLM ecosystem more secure.

---

**LUPIN - Made with love by the CrakHaus**
*Responsible disclosure protects everyone. Thank you for your ethical research.*
