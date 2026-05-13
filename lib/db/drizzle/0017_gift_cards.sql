-- Gift card purchases table
CREATE TYPE gift_card_status AS ENUM ('pending', 'active', 'delivered', 'failed');

CREATE TABLE gift_card_purchases (
    id SERIAL PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT DEFAULT '',
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    personal_message TEXT,
    amount_cents INTEGER NOT NULL,
    square_gift_card_id TEXT,
    gan TEXT,
    square_payment_id TEXT,
    square_order_id TEXT,
    status gift_card_status NOT NULL DEFAULT 'pending',
    delivered_at TIMESTAMP,
    customer_id INTEGER REFERENCES customers(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
