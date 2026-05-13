import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Link } from "wouter";

export default function Privacy() {
    return (
        <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
            <SEO
                title="Privacy Policy | Urban Churn"
                description="Urban Churn's privacy policy explains how we collect, use, and protect your personal information when you use our website and services."
                canonical="/privacy"
                breadcrumbs={[
                    { name: "Home", url: "/" },
                    { name: "Privacy Policy", url: "/privacy" },
                ]}
            />
            <Navbar />

            {/* Hero */}
            <section className="bg-[#111118] text-white pt-36 pb-16 md:pt-44 md:pb-20 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#111118] via-[#111118]/95 to-[#111118]" />
                <div className="relative max-w-2xl mx-auto px-4 sm:px-8">
                    <p className="text-[#A1AB74] text-sm font-black tracking-[0.2em] uppercase mb-4">Legal</p>
                    <h1 className="text-4xl md:text-5xl font-black leading-none tracking-tight mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-white/50 text-base">Last updated: April 17, 2026</p>
                </div>
            </section>

            {/* Content */}
            <section className="bg-white py-16 md:py-24">
                <div className="max-w-3xl mx-auto px-6 sm:px-8">
                    <div className="prose prose-gray max-w-none prose-headings:font-black prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-[#A1AB74] prose-a:no-underline hover:prose-a:underline">

                        <h2>1. Introduction</h2>
                        <p>
                            Urban Churn Craft Creamery ("Urban Churn," "we," "us," or "our") respects your privacy and is committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at urbanchurn.com (the "Site") and use our services, including online ordering, account registration, gift card purchases, event bookings, and in-store transactions (the "Services").
                        </p>
                        <p>
                            By using our Site or Services, you consent to the practices described in this Privacy Policy. If you do not agree, please do not use our Site or Services.
                        </p>

                        <h2>2. Information We Collect</h2>

                        <h3>2.1 Information You Provide Directly</h3>
                        <p>We collect information you voluntarily provide when you:</p>
                        <ul>
                            <li><strong>Create an account:</strong> First name, last name, email address, phone number, and password.</li>
                            <li><strong>Place a pre-order or bakery order:</strong> Name, email address, phone number, pickup location preference, order details, and any special requests or allergy information you provide.</li>
                            <li><strong>Purchase a gift card:</strong> Buyer name, email, phone; recipient name and email; personal message; and payment information (processed by Square).</li>
                            <li><strong>Register for an event:</strong> Name, email, phone, and payment information.</li>
                            <li><strong>Apply for wholesale:</strong> Business name, contact name, email, phone, address, and business details.</li>
                            <li><strong>Submit a contact form or catering inquiry:</strong> Name, email, subject, and message content.</li>
                            <li><strong>Apply for a job:</strong> Name, email, phone, and application details.</li>
                            <li><strong>Update your profile:</strong> Address, city, state, and ZIP code.</li>
                        </ul>

                        <h3>2.2 Information Collected Automatically</h3>
                        <p>When you visit our Site, we may automatically collect:</p>
                        <ul>
                            <li><strong>Device information:</strong> Browser type, operating system, device type, and screen resolution.</li>
                            <li><strong>Usage data:</strong> Pages visited, time spent on pages, links clicked, and referring URLs.</li>
                            <li><strong>IP address:</strong> Used for security purposes and general geographic analytics.</li>
                            <li><strong>Cookies and local storage:</strong> We use cookies and browser local storage to maintain your session, remember your cart, and store your location preference. See Section 7 for details.</li>
                        </ul>

                        <h3>2.3 Information from Third Parties</h3>
                        <ul>
                            <li><strong>Square:</strong> When you make a payment, Square may share transaction confirmation and payment status with us. We do not receive or store your full credit card number.</li>
                            <li><strong>Migrated data:</strong> If you previously ordered through our old website (WooCommerce), we may have your name, email, phone, and order history from that platform.</li>
                        </ul>

                        <h2>3. How We Use Your Information</h2>
                        <p>We use the information we collect to:</p>
                        <ul>
                            <li><strong>Fulfill orders:</strong> Process and manage your pre-orders, bakery orders, gift card purchases, and event registrations.</li>
                            <li><strong>Manage your account:</strong> Create and maintain your customer account, authenticate logins, and process password resets.</li>
                            <li><strong>Communicate with you:</strong> Send order confirmations, pickup reminders, password reset emails, and respond to inquiries.</li>
                            <li><strong>Improve our services:</strong> Analyze usage patterns to enhance our Site, menu, and customer experience.</li>
                            <li><strong>Process payments:</strong> Facilitate transactions through our payment processor (Square).</li>
                            <li><strong>Ensure security:</strong> Detect and prevent fraud, unauthorized access, and other security threats.</li>
                            <li><strong>Comply with legal obligations:</strong> Meet applicable legal, regulatory, and tax requirements.</li>
                        </ul>

                        <h2>4. How We Share Your Information</h2>
                        <p>We do not sell your personal information. We may share your information with:</p>
                        <ul>
                            <li><strong>Service providers:</strong> Third-party vendors that help us operate our business, including:
                                <ul>
                                    <li><strong>Square</strong> — payment processing and gift card management</li>
                                    <li><strong>Resend</strong> — transactional email delivery (order confirmations, password resets)</li>
                                    <li><strong>Neon (PostgreSQL)</strong> — secure cloud database hosting</li>
                                </ul>
                            </li>
                            <li><strong>Our staff:</strong> Employees and store managers access order information and customer details as necessary to fulfill orders and provide customer support.</li>
                            <li><strong>Legal requirements:</strong> We may disclose your information if required by law, legal process, or government request, or to protect the rights, property, or safety of Urban Churn, our customers, or others.</li>
                            <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
                        </ul>

                        <h2>5. Data Retention</h2>
                        <p>
                            We retain your personal information for as long as your account is active or as needed to provide you with our Services. Specifically:
                        </p>
                        <ul>
                            <li><strong>Account data:</strong> Retained as long as your account exists. You may request account deletion by contacting us.</li>
                            <li><strong>Order history:</strong> Retained for record-keeping, tax, and legal compliance purposes, typically for a minimum of 3 years.</li>
                            <li><strong>Password reset tokens:</strong> Automatically expire after 1 hour and are cleared upon use.</li>
                            <li><strong>Contact form submissions:</strong> Retained for the duration needed to respond to and resolve your inquiry.</li>
                        </ul>

                        <h2>6. Data Security</h2>
                        <p>
                            We implement appropriate technical and organizational measures to protect your personal information, including:
                        </p>
                        <ul>
                            <li>Passwords are hashed using industry-standard algorithms (bcrypt) and are never stored in plain text.</li>
                            <li>Authentication tokens are securely generated and transmitted via HTTP-only cookies and encrypted connections.</li>
                            <li>Payment information is processed directly by Square and is never stored on our servers.</li>
                            <li>Database access is restricted and encrypted in transit.</li>
                            <li>Administrative access requires authentication with role-based permissions.</li>
                        </ul>
                        <p>
                            While we strive to protect your information, no method of electronic storage or transmission over the Internet is 100% secure. We cannot guarantee absolute security.
                        </p>

                        <h2>7. Cookies &amp; Local Storage</h2>
                        <p>Our Site uses the following cookies and browser storage:</p>
                        <ul>
                            <li><strong>Authentication cookie</strong> (<code>customer_token</code>): An HTTP-only cookie that keeps you logged in for up to 7 days. Essential for account functionality.</li>
                            <li><strong>Cart storage:</strong> Your shopping cart contents are saved in browser local storage so your selections persist between visits. Cart data expires after 7 days.</li>
                            <li><strong>Location preference:</strong> Your selected pickup location is saved in local storage for convenience.</li>
                        </ul>
                        <p>
                            We do not use third-party advertising cookies. You can clear cookies and local storage through your browser settings, though this may affect Site functionality (e.g., you will be logged out and your cart will be cleared).
                        </p>

                        <h2>8. Your Rights &amp; Choices</h2>
                        <p>Depending on your location, you may have the following rights:</p>
                        <ul>
                            <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
                            <li><strong>Correction:</strong> Update or correct inaccurate information via your account profile or by contacting us.</li>
                            <li><strong>Deletion:</strong> Request deletion of your account and personal information. Note that certain data may be retained for legal and record-keeping purposes.</li>
                            <li><strong>Opt-out of communications:</strong> While we do not send marketing emails, you may contact us if you wish to limit communications to essential order-related messages only.</li>
                        </ul>
                        <p>
                            To exercise any of these rights, contact us at <a href="mailto:contact@urbanchurn.com">contact@urbanchurn.com</a>.
                        </p>

                        <h2>9. Children's Privacy</h2>
                        <p>
                            Our Site is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected information from a child under 13 without parental consent, we will promptly delete that information. If you believe a child has provided us with personal information, please contact us at <a href="mailto:contact@urbanchurn.com">contact@urbanchurn.com</a>.
                        </p>

                        <h2>10. Third-Party Links</h2>
                        <p>
                            Our Site may contain links to third-party websites (e.g., Square for gift card purchases, Instagram, Facebook). We are not responsible for the privacy practices or content of those websites. We encourage you to review the privacy policies of any third-party sites you visit.
                        </p>

                        <h2>11. California Residents</h2>
                        <p>
                            If you are a California resident, you may have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, the right to request deletion, and the right not to be discriminated against for exercising your rights. We do not sell personal information as defined by the CCPA. To submit a request, contact us at <a href="mailto:contact@urbanchurn.com">contact@urbanchurn.com</a>.
                        </p>

                        <h2>12. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. We encourage you to review this policy periodically. Your continued use of the Site or Services after any changes constitutes your acceptance of the updated Privacy Policy.
                        </p>

                        <h2>13. Contact Us</h2>
                        <p>
                            If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
                        </p>
                        <ul>
                            <li><strong>Email:</strong> <a href="mailto:contact@urbanchurn.com">contact@urbanchurn.com</a></li>
                            <li><strong>Phone:</strong> <a href="tel:17178849396">(717) 884-9396</a></li>
                            <li><strong>Mail:</strong> Urban Churn Craft Creamery, Carlisle, PA 17013</li>
                            <li><strong>Website:</strong> <Link href="/contact">urbanchurn.com/contact</Link></li>
                        </ul>

                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
