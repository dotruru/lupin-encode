# Privacy Policy

**Last Updated:** 14 November 2025
**Effective Date:** 14 November 2025

## 1. Introduction

This Privacy Policy explains how LUPIN ("We", "Us", "Our", "the Software") collects, uses, stores, and protects information when you use our security testing platform. CrakHaus is committed to protecting your privacy and ensuring transparency in our data handling practices.

This policy complies with:
- General Data Protection Regulation (GDPR) (EU) 2016/679
- UK Data Protection Act 2018
- Privacy and Electronic Communications Regulations (PECR)
- Other applicable data protection legislation

## 2. Information We Collect

**2.1 Automatically Collected Information**

LUPIN operates primarily as a local application. The following data is stored locally on your device:

**Database Records:**
- Jailbreak prompts and attempts (text content, timestamps)
- PIE (Prompt Injection Exploit) entries you create or import
- Regression test results and safety scores
- Test history and metrics
- Configuration settings and preferences
- Notepad drafts created by the agent

**2.2 Information You Provide**

**User-Supplied Data:**
- API keys for third-party services (OpenRouter, Hugging Face, GitHub)
- Target model identifiers
- Custom exploit entries and descriptions
- Test parameters and configurations
- Search queries for exploit discovery

**2.3 Information We Do NOT Collect**

We do NOT collect:
- Personal identification information (name, address, phone number)
- Email addresses (unless you contact us directly)
- Payment information (all transactions are with third-party API providers)
- Biometric data
- Location data
- Browser fingerprints or tracking cookies
- Usage analytics or telemetry (unless you explicitly enable it)

## 3. How We Use Your Information

**3.1 Local Processing**

All data processing occurs locally on your device:
- **Exploit Database**: Stores your PIE entries for regression testing
- **Test Results**: Maintains history of security assessments
- **Agent State**: Tracks jailbreak attempts and strategies
- **Configuration**: Saves your preferences and API settings

**3.2 Third-Party API Calls**

When you use LUPIN's features, data is transmitted to third-party services:

**OpenRouter:**
- Purpose: LLM API access for jailbreak testing
- Data Sent: Prompts, model identifiers, API keys
- Privacy Policy: https://openrouter.ai/privacy

**Hugging Face:**
- Purpose: Exploit discovery and dataset access
- Data Sent: Search queries, API keys
- Privacy Policy: https://huggingface.co/privacy

**GitHub:**
- Purpose: Web scraping for security research (if enabled)
- Data Sent: HTTP requests for public repository data
- Privacy Policy: https://docs.github.com/en/site-policy/privacy-policies

**3.3 We Do NOT**
- Transmit your data to our servers (all data remains local)
- Track your usage patterns or behaviour
- Share your data with advertisers or data brokers
- Use your data for marketing purposes
- Create user profiles or conduct surveillance

## 4. Data Storage and Security

**4.1 Local Storage**

**SQLite Database:**
- Location: `/backend/lupin.db` in your installation directory
- Contains: Exploits, attempts, test runs, and configurations
- Access: Only accessible locally on your device
- Encryption: Not encrypted by default (user responsible for disk encryption)

**4.2 API Key Security**

**Important Security Recommendations:**
- API keys are stored in your local database
- We recommend encrypting your storage drive
- Never commit API keys to version control
- Use environment variables or secure key management systems
- Rotate API keys regularly
- Monitor API usage for unauthorised activity

**4.3 Data Retention**

**Local Data:**
- Data persists until you manually delete it
- You can delete the database file to remove all records
- Individual entries can be removed through the UI
- Test history is retained indefinitely unless deleted

**4.4 Security Measures**

We implement reasonable security practices:
- No external data transmission (except to user-configured APIs)
- Local-first architecture minimising attack surface
- No built-in telemetry or analytics
- Open-source codebase for transparency and audit

**However, you are responsible for:**
- Securing your device and database files
- Protecting API keys from unauthorised access
- Implementing disk encryption if handling sensitive data
- Following security best practices in your environment

## 5. Third-Party Services

**5.1 External Dependencies**

LUPIN integrates with external services that have their own privacy policies:

**OpenRouter:**
- You create a direct relationship with OpenRouter
- Your API usage is governed by their privacy policy
- We do not control their data handling practices
- Review: https://openrouter.ai/privacy

**Hugging Face:**
- Direct API integration for exploit discovery
- Subject to Hugging Face privacy terms
- We do not control their data retention or usage
- Review: https://huggingface.co/privacy

**GitHub:**
- Public data access through web scraping
- Subject to GitHub's Terms of Service
- Review: https://docs.github.com/en/site-policy/privacy-policies

**5.2 Data Sharing**

We do NOT share your data with third parties, except:
- When you explicitly direct the Software to make API calls to configured services
- As required by law (court orders, legal obligations)
- To protect our rights, safety, or property (in extreme circumstances)

## 6. Your Rights Under GDPR and UK DPA

**6.1 Data Subject Rights**

If you are in the UK or EU, you have the following rights:

**Right to Access:**
- You can access all your data in the SQLite database
- Export functionality available for PIE database
- Database file is readable with standard SQLite tools

**Right to Rectification:**
- Edit exploit entries and test data through the UI
- Modify or delete incorrect information
- Update configuration settings at any time

**Right to Erasure ("Right to be Forgotten"):**
- Delete individual exploits, attempts, or test runs
- Remove entire database by deleting `lupin.db`
- Uninstall LUPIN to remove all local data

**Right to Data Portability:**
- Export PIE database as JSON/CSV (feature roadmap)
- SQLite database is portable and can be backed up
- Use standard database tools for data migration

**Right to Restriction of Processing:**
- Since processing is local, you control all data usage
- Disable specific features through configuration

**Right to Object:**
- Stop using LUPIN at any time to cease processing
- No profiling or automated decision-making occurs

**Right to Withdraw Consent:**
- Uninstall LUPIN to withdraw all consent
- Delete database to remove stored data

**6.2 Exercising Your Rights**

Since all data is stored locally:
- You have direct control over your information
- No requests to us are necessary for data access or deletion
- For questions, contact us using details in Section 11

## 7. Children's Privacy

LUPIN is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If you become aware that a child has used LUPIN, please contact us.

Security research and penetration testing require maturity, legal understanding, and ethical judgement appropriate for adults.

## 8. International Data Transfers

**8.1 Local Processing**
LUPIN processes data locally on your device. No international data transfers occur through our systems.

**8.2 Third-Party APIs**
When you use integrated services:
- OpenRouter: May transfer data internationally
- Hugging Face: May transfer data internationally
- GitHub: May transfer data internationally

Review each service's privacy policy for details on international transfers and safeguards.

## 9. Data Breach Notification

**9.1 Our Obligations**

Since we do not operate servers or collect user data:
- We cannot experience a data breach of your information
- Your data security depends on your local device security

**9.2 Your Obligations**

If you believe your API keys have been compromised:
- Immediately revoke and rotate affected keys
- Review API usage logs for unauthorised activity
- Notify the relevant API provider
- Consider changing credentials for related services

## 10. Changes to This Privacy Policy

**10.1 Updates**

We may update this Privacy Policy to reflect:
- Changes in data processing practices
- New features or functionality
- Legal or regulatory requirements
- Security enhancements

**10.2 Notification**

Changes will be communicated through:
- Updated "Last Updated" date at the top of this document
- Announcements in the GitHub repository
- Prominent notices in the Software interface

**10.3 Continued Use**

Your continued use of LUPIN after changes constitutes acceptance of the updated Privacy Policy.

## 11. Contact Information

**Data Controller:**
CrakHaus

**Contact Methods:**
- Email: [Your Contact Email]
- GitHub Issues: https://github.com/[your-repo]/issues
- GitHub Repository: https://github.com/[your-repo]

**For Privacy Enquiries:**
Please include "Privacy Policy" in your subject line.

**Response Time:**
We aim to respond to privacy enquiries within 30 days.

## 12. Supervisory Authority

If you are in the UK or EU and believe we have not adequately addressed your privacy concerns, you have the right to lodge a complaint with your supervisory authority:

**UK:**
Information Commissioner's Office (ICO)
Website: https://ico.org.uk
Phone: 0303 123 1113

**EU:**
Contact your local Data Protection Authority
List: https://edpb.europa.eu/about-edpb/board/members_en

## 13. Legal Basis for Processing (GDPR)

Where GDPR applies, our legal basis for processing:

**Legitimate Interests (Article 6(1)(f)):**
- Providing security research functionality
- Maintaining software stability and security
- Improving the Software based on feedback

**Consent (Article 6(1)(a)):**
- When you voluntarily provide information
- When you configure third-party API integrations

**Legal Obligations (Article 6(1)(c)):**
- Compliance with applicable laws
- Responding to lawful requests from authorities

## 14. Cookies and Tracking

**14.1 No Tracking**

LUPIN does not use:
- Cookies
- Web beacons
- Analytics tracking
- Advertising pixels
- Fingerprinting technologies

**14.2 Local Storage**

The web interface may use browser localStorage for:
- UI preferences (theme, layout)
- Session state
- No tracking or profiling purposes

This data remains on your device and is not transmitted.

## 15. Automated Decision-Making

LUPIN does not engage in automated decision-making or profiling that produces legal effects or similarly significantly affects you.

The jailbreak agent makes autonomous decisions about which prompts to test, but this is a security research function under your direct control, not profiling for external purposes.

## 16. Acknowledgement

BY USING LUPIN, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO THIS PRIVACY POLICY.

---

**LUPIN - Made with love by the CrakHaus**
*Your privacy is important to us. Questions? Get in touch.*
