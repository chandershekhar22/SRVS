import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function HowToGuide() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How to Verify Panelist Attributes
          </h1>
          <p className="text-lg text-gray-600 italic">
            A Step-by-Step Guide to Zero-Knowledge Proof Verification
          </p>
        </div>

        {/* What is TrueProof Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-red-500 mb-4 pb-2 border-b border-gray-200">
            What is TrueProof?
          </h2>
          <p className="text-gray-700 mb-4">
            TrueProof is a <strong>zero-knowledge proof (ZKP) powered verification platform</strong> designed specifically for the market research industry. It enables you to verify panelist attributes—such as job title, industry, demographics, and vehicle ownership—<strong>without storing any personally identifiable information (PII)</strong>.
          </p>
          <p className="text-gray-700">
            Unlike traditional verification methods that collect and store sensitive data, TrueProof performs a <strong>one-time read</strong> from authoritative sources (LinkedIn, DigiLocker or any digital source which is valid in respective region) and generates <strong>cryptographic mathematical proofs</strong> that verify claims are true—then discards the source data entirely.
          </p>
        </section>

        {/* Who Should Use This Guide Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-red-500 mb-4 pb-2 border-b border-gray-200">
            Who Should Use This Guide?
          </h2>
          <p className="text-gray-700 mb-4">This guide is for:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>
              <strong>Insight Companies</strong> – Verify pre-recruited participants before qualitative interviews, focus groups, IDIs, or CATI studies
            </li>
            <li>
              <strong>Panel Companies</strong> – Offer verified panels as a premium product and build trust with clients
            </li>
            <li>
              <strong>Research Operations Teams</strong> – Streamline quality assurance and reduce costs from unqualified recruits
            </li>
          </ul>
        </section>

        {/* Getting Started Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-red-500 mb-4 pb-2 border-b border-gray-200">
            Getting Started
          </h2>

          {/* Step 1 */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-red-400 mb-3">
              Step 1: Log In to the Admin Dashboard
            </h3>
            <p className="text-gray-700 mb-4">
              Navigate to <strong>https://quidinsights.netlify.app/</strong> and sign in with your administrator credentials. If you don't have an account, contact our team to set up your organization.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-gray-700">
                <span className="text-yellow-500 mr-2">💡</span>
                Your data stays secure: TrueProof uses a local connector installed at your infrastructure. We never directly access your panel database.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-red-400 mb-3">
              Step 2: Establish Your Data Connection
            </h3>
            <p className="text-gray-700 mb-4">
              Connect your participant data source using one of two methods:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>
                <strong>API Integration (Recommended)</strong> – Connect via secure API for automated, real-time data syncing
              </li>
              <li>
                <strong>Excel Upload</strong> – Manually upload participant lists for one-time or batch verification
              </li>
            </ul>
            <p className="text-gray-700">
              <strong className="text-red-500">Important:</strong> All participant identifiers are hashed/encrypted before transmission. No PII flows through our servers.
            </p>
          </div>

          {/* Step 3 */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-red-400 mb-3">
              Step 3: Create a New Study
            </h3>
            <p className="text-gray-700 mb-4">
              Click the "New Study" button and configure:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Study Name</strong> – A descriptive name for internal tracking (e.g., "Q1 Healthcare Decision Makers")
              </li>
              <li>
                <strong>Participant Source</strong> – Select the connected data source or upload a new list
              </li>
              <li>
                <strong>Target Volume</strong> – Set how many participants you want to verify
              </li>
            </ul>
          </div>

          {/* Step 4 */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-red-400 mb-3">
              Step 4: Configure Attributes to Verify
            </h3>
            <p className="text-gray-700 mb-6">
              Select which attributes need verification from the available categories:
            </p>

            {/* Attributes Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Attributes</th>
                    <th className="px-4 py-3 text-left">Verification Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-red-500 font-semibold">Demographics</td>
                    <td className="px-4 py-3 text-gray-700">Age, Gender, Location, Education, Nationality</td>
                    <td className="px-4 py-3 text-gray-700">Government IDs, DigiLocker</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-semibold">Professional</td>
                    <td className="px-4 py-3 text-gray-700">Job Title, Industry, Company, Company Size, Experience</td>
                    <td className="px-4 py-3 text-gray-700">LinkedIn Profile</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-red-500 font-semibold">Ownership</td>
                    <td className="px-4 py-3 text-gray-700">Vehicle Ownership, Make/Model, Home Ownership</td>
                    <td className="px-4 py-3 text-gray-700">Vehicle RC, Property Documents</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-semibold">Custom</td>
                    <td className="px-4 py-3 text-gray-700">Healthcare Credentials, Financial Qualifications, Certifications</td>
                    <td className="px-4 py-3 text-gray-700">Configurable per requirement</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-gray-700">
              For each attribute, you can define specific verification queries (e.g., "Job Title = Marketing Director" or "Industry = Healthcare").
            </p>
          </div>

          {/* Step 5 */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-red-400 mb-3">
              Step 5: Send Verification Invitations
            </h3>
            <p className="text-gray-700 mb-4">
              Once configured, trigger the verification process:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Verification emails are sent via your SMTP server (not ours) to maintain brand consistency</li>
              <li>Participants click the link and authenticate with the relevant source (LinkedIn, DigiLocker, etc.)</li>
              <li>They grant one-time read access—the system reads, generates proof, and discards the data</li>
              <li>Average completion time: <strong>2-3 minutes</strong> per participant</li>
            </ul>
          </div>

          {/* Step 6 */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-red-400 mb-3">
              Step 6: Review Verification Results
            </h3>
            <p className="text-gray-700 mb-4">
              Access your study dashboard to view real-time results:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Verification Status</strong> – See who has completed, pending, or declined verification</li>
              <li><strong>Proof Details</strong> – View the cryptographic proof for each verified attribute</li>
              <li><strong>Match Results</strong> – Compare verified attributes against self-reported data</li>
              <li><strong>Audit Trail</strong> – Full traceability of the verification procedure for compliance</li>
            </ul>
          </div>

          {/* Step 7 */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-red-400 mb-3">
              Step 7: Export & Use Verified Data
            </h3>
            <p className="text-gray-700 mb-4">
              Export your results in multiple formats:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>CSV/Excel</strong> – For integration with your existing systems</li>
              <li><strong>API Response</strong> – Automated data return to your panel management system</li>
              <li><strong>Verification Certificates</strong> – Shareable proof documents for clients or auditors</li>
            </ul>
          </div>
        </section>

        {/* Understanding Zero-Knowledge Proofs Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-red-500 mb-4 pb-2 border-b border-gray-200">
            Understanding Zero-Knowledge Proofs
          </h2>

          <p className="text-gray-700 mb-4">
            <strong>Simple Analogy:</strong> Imagine proving you're over 21 to enter a bar—without showing your actual ID. The bouncer knows your age is valid, but never sees your birthdate, address, or photo. That's ZKP.
          </p>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">How It Works in TrueProof:</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>System reads attribute from authoritative source (e.g., LinkedIn says "Job Title: VP Marketing")</li>
              <li>Mathematical proof is generated confirming the attribute matches your query</li>
              <li>Source data is immediately discarded—only the proof remains</li>
              <li>Proof is cryptographically verifiable by anyone, anytime</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-gray-700">
              <span className="text-yellow-500 mr-2">💡</span>
              Key Benefit: ZKP technology is already proven in banking, cryptocurrency, and blockchain systems handling billions in transactions. We are aligned to bring this technology to the market research domain as well.
            </p>
          </div>
        </section>

        {/* Best Practices Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-red-500 mb-4 pb-2 border-b border-gray-200">
            Best Practices
          </h2>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Maximize Verification Completion Rates</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Communicate the benefit:</strong> Tell participants their data is never stored—only verified once and discarded</li>
              <li><strong>Keep it simple:</strong> Verify only 3-5 essential attributes per study or panelist to minimize friction</li>
              <li><strong>Brand the experience:</strong> Use your own email templates and messaging for consistency</li>
              <li><strong>Offer incentives:</strong> Verified panelists can be rewarded with priority study access or bonus points</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Optimize Study Design</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Pre-verify before scheduling:</strong> Run verification before booking expensive qual sessions</li>
              <li><strong>Compare against self-reported:</strong> Use the match analysis to identify data quality issues in your panel</li>
              <li><strong>Re-verify periodically:</strong> Professional attributes may change—annual re-verification keeps data fresh</li>
            </ul>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-red-500 mb-4 pb-2 border-b border-gray-200">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div>
              <p className="text-gray-900 font-semibold">
                <span className="text-red-500">Q:</span> What data sources can be verified?
              </p>
              <p className="text-gray-700 ml-6">
                <span className="font-semibold">A:</span> Currently supported: LinkedIn (professional), DigiLocker (government IDs, vehicle RC), and configurable custom sources. More integrations coming soon.
              </p>
            </div>

            <div>
              <p className="text-gray-900 font-semibold">
                <span className="text-red-500">Q:</span> How long does verification take for participants?
              </p>
              <p className="text-gray-700 ml-6">
                <span className="font-semibold">A:</span> Typically 2-3 minutes. They click a link, authenticate with the source, grant one-time access, and they're done.
              </p>
            </div>

            <div>
              <p className="text-gray-900 font-semibold">
                <span className="text-red-500">Q:</span> What if a participant doesn't complete verification?
              </p>
              <p className="text-gray-700 ml-6">
                <span className="font-semibold">A:</span> You can send reminders, extend deadlines, or proceed with unverified participants flagged in your export.
              </p>
            </div>

            <div>
              <p className="text-gray-900 font-semibold">
                <span className="text-red-500">Q:</span> Is the ZKP proof legally admissible?
              </p>
              <p className="text-gray-700 ml-6">
                <span className="font-semibold">A:</span> ZKP proofs provide cryptographic certainty and full audit trails. Consult your legal team for jurisdiction-specific requirements.
              </p>
            </div>

            <div>
              <p className="text-gray-900 font-semibold">
                <span className="text-red-500">Q:</span> How is this different from RelevantID or TrueSample?
              </p>
              <p className="text-gray-700 ml-6">
                <span className="font-semibold">A:</span> Those tools detect fraud and duplicates. TrueProof verifies that real participants' claimed attributes are actually true—a complementary function.
              </p>
            </div>
          </div>
        </section>

        {/* Need Help Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-red-500 mb-4 pb-2 border-b border-gray-200">
            Need Help?
          </h2>
          <p className="text-gray-700 mb-4">Our team is here to support you:</p>
          <ul className="list-disc pl-6 text-gray-700">
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:Info@quidinsights.com" className="text-red-500 hover:underline">
                Info@quidinsights.com
              </a>
            </li>
          </ul>
        </section>

      </main>

      <Footer />
    </div>
  );
}
