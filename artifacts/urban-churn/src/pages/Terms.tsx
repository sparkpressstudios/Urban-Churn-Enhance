import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Link } from "wouter";

export default function Terms() {
    return (
        <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
            <SEO
                title="Terms & Conditions | Urban Churn"
                description="Read Urban Churn's terms and conditions including our pre-order refund policy, ordering terms, and usage policies for our website and services."
                canonical="/terms"
                breadcrumbs={[
                    { name: "Home", url: "/" },
                    { name: "Terms & Conditions", url: "/terms" },
                ]}
            />
            <Navbar />

            {/* Hero */}
            <section className="bg-[#111118] text-white pt-36 pb-16 md:pt-44 md:pb-20 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#111118] via-[#111118]/95 to-[#111118]" />
                <div className="relative max-w-2xl mx-auto px-4 sm:px-8">
                    <p className="text-[#A1AB74] text-sm font-black tracking-[0.2em] uppercase mb-4">Legal</p>
                    <h1 className="text-4xl md:text-5xl font-black leading-none tracking-tight mb-4">
                        Terms &amp; Conditions
                    </h1>
                    <p className="text-white/50 text-base">Last updated: April 17, 2026</p>
                </div>
            </section>

            {/* Content */}
            <section className="bg-white py-16 md:py-24">
                <div className="max-w-3xl mx-auto px-6 sm:px-8">
                    <div className="prose prose-gray max-w-none prose-headings:font-black prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-[#A1AB74] prose-a:no-underline hover:prose-a:underline">

                        <h2>1. Overview</h2>
                        <p>
                            Welcome to Urban Churn Craft Creamery ("Urban Churn," "we," "us," or "our"). These Terms &amp; Conditions ("Terms") govern your use of our website at urbanchurn.com (the "Site"), our mobile ordering features, and any related services, including online pre-orders, bakery orders, gift card purchases, catering inquiries, wholesale accounts, event ticket purchases, and in-store transactions (collectively, the "Services").
                        </p>
                        <p>
                            By accessing or using our Site or Services, you agree to be bound by these Terms. If you do not agree, please do not use our Site or Services.
                        </p>

                        <h2>2. Eligibility</h2>
                        <p>
                            You must be at least 13 years old to create an account on our Site. If you are under 18, you may use our Services only with the involvement of a parent or guardian. By placing an order, you represent that you have the legal capacity to enter into a binding agreement.
                        </p>

                        <h2>3. Account Registration</h2>
                        <p>
                            You may create a customer account to track orders and manage your profile. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to provide accurate, current, and complete information during registration and to update it as necessary.
                        </p>
                        <p>
                            We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity.
                        </p>

                        <h2>4. Pre-Order Terms &amp; Refund Policy</h2>
                        <p>
                            Urban Churn offers weekly limited-edition flavour pre-orders for pickup at our retail locations. The following terms apply to all pre-orders:
                        </p>

                        <h3>4.1 How Pre-Orders Work</h3>
                        <ul>
                            <li>Browse available limited-edition flavours and select your preferred pickup location.</li>
                            <li>Submit your pre-order through our Site. Payment is collected at the time of pickup unless otherwise stated.</li>
                            <li>Each pre-order is assigned a specific pickup window and location.</li>
                        </ul>

                        <h3>4.2 Pickup Policy</h3>
                        <ul>
                            <li><strong>Orders are held for up to 2 weeks</strong> from the designated pickup date at your selected location.</li>
                            <li>If your order is not picked up by the end of the 2nd week, it will continue to be held but may be subject to limited availability.</li>
                        </ul>

                        <h3>4.3 Credits &amp; Refunds</h3>
                        <ul>
                            <li><strong>Week 3:</strong> If your item has not been picked up by the 3rd week, you may request a store credit by contacting us at <a href="mailto:contact@urbanchurn.com">contact@urbanchurn.com</a> or calling <a href="tel:17178849396">(717) 884-9396</a>.</li>
                            <li><strong>Week 4 and beyond:</strong> After the 4th week, orders that have not been picked up are <strong>nonrefundable</strong> and no credit will be issued. The product is no longer available for retrieval.</li>
                        </ul>

                        <h3>4.4 Cancellations</h3>
                        <p>
                            Pre-orders may be cancelled before the designated pickup date by contacting us directly. Once the pickup date has passed, the pickup and refund policy above applies. We reserve the right to cancel any pre-order due to ingredient shortages, production issues, or other unforeseen circumstances. In such cases, a full refund or credit will be provided.
                        </p>

                        <h3>4.5 Modifications</h3>
                        <p>
                            Changes to pre-orders (flavour, size, or pickup location) must be requested at least 24 hours before the pickup date by contacting us. We will accommodate changes when possible but cannot guarantee availability.
                        </p>

                        <h2>5. Bakery &amp; Custom Orders</h2>
                        <p>
                            Custom ice cream cakes, custom cakes, and cupcake orders are made to order and subject to the following:
                        </p>
                        <ul>
                            <li><strong>Lead time:</strong> Custom orders require advance notice. Please submit your order with sufficient time before your desired pickup date.</li>
                            <li><strong>Cancellations:</strong> Custom orders may be cancelled up to 48 hours before the scheduled pickup date for a full refund. Cancellations within 48 hours of pickup are nonrefundable, as production has likely begun.</li>
                            <li><strong>Allergens:</strong> Our products are made in a facility that handles milk, eggs, wheat, soy, peanuts, tree nuts, and other allergens. We cannot guarantee an allergen-free environment. Please inform us of any allergies when placing your order.</li>
                        </ul>

                        <h2>6. Gift Cards</h2>
                        <p>
                            Digital gift cards purchased through our Site are processed via Square. Gift cards are non-refundable once issued, have no expiration date, and cannot be redeemed for cash except where required by law. Lost or stolen gift cards cannot be replaced without proof of purchase. Urban Churn is not responsible for unauthorized use of gift cards.
                        </p>

                        <h2>7. Event Tickets &amp; Tasting Events</h2>
                        <p>
                            Tickets purchased for Urban Churn events (including tasting events) are subject to availability. Refund policies for events will be stated at the time of purchase. Unless otherwise noted, event tickets are nonrefundable but may be transferable to another attendee. Urban Churn reserves the right to modify, reschedule, or cancel events, in which case a full refund will be issued.
                        </p>

                        <h2>8. Pricing &amp; Payment</h2>
                        <p>
                            All prices are listed in US Dollars and are subject to change without notice. We use Square for payment processing. By making a purchase, you agree to Square's terms of service in addition to these Terms. We are not responsible for payment processing errors caused by third-party providers.
                        </p>
                        <p>
                            Sales tax will be applied where required by Pennsylvania state and local law.
                        </p>

                        <h2>9. Wholesale Accounts</h2>
                        <p>
                            Wholesale accounts are subject to separate wholesale terms agreed upon during the application process. Wholesale pricing, minimum order quantities, delivery schedules, and payment terms are established on a per-account basis. Urban Churn reserves the right to approve, deny, or terminate wholesale accounts at our discretion.
                        </p>

                        <h2>10. Catering &amp; Fundraising</h2>
                        <p>
                            Catering and fundraising inquiries are handled on a case-by-case basis. Specific terms, pricing, and cancellation policies will be communicated during the booking process. Deposits may be required and are subject to the cancellation terms provided at the time of booking.
                        </p>

                        <h2>11. Intellectual Property</h2>
                        <p>
                            All content on our Site — including text, graphics, logos, images, product names, flavour names, and software — is the property of Urban Churn or our licensors and is protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from our content without our prior written consent.
                        </p>

                        <h2>12. User Conduct</h2>
                        <p>You agree not to:</p>
                        <ul>
                            <li>Use the Site for any unlawful purpose or in violation of any applicable law.</li>
                            <li>Attempt to gain unauthorized access to our systems, accounts, or data.</li>
                            <li>Submit false, misleading, or fraudulent orders or information.</li>
                            <li>Interfere with the proper functioning of the Site or Services.</li>
                            <li>Scrape, harvest, or collect information from the Site without our written permission.</li>
                        </ul>

                        <h2>13. Limitation of Liability</h2>
                        <p>
                            To the fullest extent permitted by law, Urban Churn and its owners, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your access to or use of (or inability to use) the Site or Services. Our total liability shall not exceed the amount you paid for the specific product or service giving rise to the claim.
                        </p>

                        <h2>14. Disclaimer of Warranties</h2>
                        <p>
                            Our Site and Services are provided "as is" and "as available" without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Site will be uninterrupted, error-free, or free of harmful components.
                        </p>

                        <h2>15. Indemnification</h2>
                        <p>
                            You agree to indemnify, defend, and hold harmless Urban Churn and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorneys' fees) arising out of your use of the Site or Services, your violation of these Terms, or your violation of any rights of a third party.
                        </p>

                        <h2>16. Governing Law</h2>
                        <p>
                            These Terms are governed by and construed in accordance with the laws of the Commonwealth of Pennsylvania, without regard to its conflict of law principles. Any disputes arising under these Terms shall be resolved in the state or federal courts located in Cumberland County, Pennsylvania.
                        </p>

                        <h2>17. Changes to These Terms</h2>
                        <p>
                            We may update these Terms from time to time. When we do, we will revise the "Last updated" date at the top of this page. Your continued use of the Site or Services after any changes constitutes your acceptance of the updated Terms. We encourage you to review these Terms periodically.
                        </p>

                        <h2>18. Contact Us</h2>
                        <p>
                            If you have questions about these Terms, please contact us:
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
