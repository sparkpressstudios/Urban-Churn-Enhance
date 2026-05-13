                                             Table "public.gift_card_purchases"
       Column        |            Type             | Collation | Nullable |                     Default                     
---------------------+-----------------------------+-----------+----------+-------------------------------------------------
 id                  | integer                     |           | not null | nextval('gift_card_purchases_id_seq'::regclass)
 order_number        | text                        |           | not null | 
 buyer_name          | text                        |           | not null | 
 buyer_email         | text                        |           | not null | 
 buyer_phone         | text                        |           |          | ''::text
 recipient_name      | text                        |           | not null | 
 recipient_email     | text                        |           | not null | 
 personal_message    | text                        |           |          | 
 amount_cents        | integer                     |           | not null | 
 square_gift_card_id | text                        |           |          | 
 gan                 | text                        |           |          | 
 square_payment_id   | text                        |           |          | 
 square_order_id     | text                        |           |          | 
 status              | gift_card_status            |           | not null | 'pending'::gift_card_status
 delivered_at        | timestamp without time zone |           |          | 
 customer_id         | integer                     |           |          | 
 created_at          | timestamp without time zone |           | not null | now()
 updated_at          | timestamp without time zone |           | not null | now()
Indexes:
    "gift_card_purchases_pkey" PRIMARY KEY, btree (id)
    "gift_card_purchases_order_number_key" UNIQUE CONSTRAINT, btree (order_number)
Foreign-key constraints:
    "gift_card_purchases_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id)

