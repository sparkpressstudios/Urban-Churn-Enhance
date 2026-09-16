import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

export default function GiftCards() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <SEO
        title="Gift Cards | Urban Churn"
        description="Send a digital gift card to someone special. Redeemable at all Urban Churn locations in Carlisle, Mechanicsburg, and Harrisburg, PA."
        canonical="/gift-cards"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Gift Cards", url: "/gift-cards" },
        ]}
      />
      <main className="flex-1 pt-16">
        <iframe
          src="https://app.squareup.com/gift/47S511R07983P/order"
          title="Urban Churn Gift Cards"
          className="w-full"
          style={{ height: "calc(100vh - 64px)", border: "none" }}
          allow="payment"
        />
      </main>
      <Footer />
    </div>
  );
}
