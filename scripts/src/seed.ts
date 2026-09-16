import { db, pool } from "@workspace/db";
import {
    adminUsersTable,
    flavoursTable,
    sizesTable,
    productsTable,
    locationsTable,
    locationHoursTable,
    productPreOrdersTable,
    bakeryOrdersTable,
    eventsTable,
    eventTicketTypesTable,
} from "@workspace/db/schema";
import * as crypto from "node:crypto";

// Simple password hashing using scrypt (no extra deps needed for seed)
async function hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString("hex");
        crypto.scrypt(password, salt, 64, (err, key) => {
            if (err) reject(err);
            resolve(`${salt}:${key.toString("hex")}`);
        });
    });
}

async function seed() {
    console.log("🌱 Seeding database...");

    // --- Admin User ---
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "admin123";
    const passwordHash = await hashPassword(adminPassword);

    const [admin] = await db
        .insert(adminUsersTable)
        .values({ username: "admin", passwordHash })
        .onConflictDoNothing()
        .returning();
    if (admin) {
        console.log(`✅ Admin user created: ${admin.username}`);
    } else {
        console.log("ℹ️  Admin user already exists, skipped.");
    }

    // --- Flavours ---
    const flavourData = [
        {
            name: "Mint Chip",
            slug: "mint-chip",
            description: "Cool peppermint with dark chocolate chips",
            tag: "classic" as const,
            emoji: "🍃",
            basePrice: "7.00",
            available: true,
            sortOrder: 1,
        },
        {
            name: "Truly Strawberry",
            slug: "truly-strawberry",
            description: "Fresh PA strawberries in rich 16% butterfat",
            tag: "fan-favorite" as const,
            emoji: "🍓",
            basePrice: "7.00",
            available: true,
            sortOrder: 2,
        },
        {
            name: "Vanilla",
            slug: "vanilla",
            description: "Madagascar vanilla bean in signature cream",
            tag: "bestseller" as const,
            emoji: "🤍",
            basePrice: "7.00",
            available: true,
            sortOrder: 3,
        },
        {
            name: "Chocolate",
            slug: "chocolate",
            description: "Rich, dark chocolate crafted from premium cocoa",
            tag: "classic" as const,
            emoji: "🍫",
            basePrice: "7.00",
            available: true,
            sortOrder: 4,
        },
        {
            name: "Mango Habanero",
            slug: "mango-habanero",
            description: "Tropical mango with a spicy habanero finish",
            tag: "limited" as const,
            emoji: "🥭",
            basePrice: "8.00",
            available: true,
            sortOrder: 5,
        },
        {
            name: "Sweet Potato Casserole",
            slug: "sweet-potato-casserole",
            description: "Brown butter, pecan, and marshmallow swirls",
            tag: "seasonal" as const,
            emoji: "🍠",
            basePrice: "8.00",
            available: true,
            sortOrder: 6,
        },
        {
            name: "Sauerkraut",
            slug: "sauerkraut",
            description: "Tangy, sweet, and completely adventurous",
            tag: "adventurous" as const,
            emoji: "✨",
            basePrice: "8.00",
            available: true,
            sortOrder: 7,
        },
        {
            name: "Summer Corn",
            slug: "summer-corn",
            description: "Sweet summer corn — shockingly delicious",
            tag: "seasonal" as const,
            emoji: "🌽",
            basePrice: "8.00",
            available: false,
            sortOrder: 8,
        },
        {
            name: "Lemon Bar Sundae",
            slug: "lemon-bar-sundae",
            description: "Tart lemon curd with shortbread crumble",
            tag: "coming-soon" as const,
            emoji: "🍋",
            basePrice: "8.00",
            available: false,
            sortOrder: 9,
        },
    ];

    const flavours = await db
        .insert(flavoursTable)
        .values(flavourData)
        .onConflictDoNothing()
        .returning();
    console.log(`✅ Inserted ${flavours.length} flavours`);

    // --- Sizes ---
    const sizeData = [
        {
            name: "Pint",
            slug: "pint",
            volumeOz: 16,
            price: "7.00",
            description: "Perfect for 1–2 people",
            sortOrder: 1,
        },
        {
            name: "Quart",
            slug: "quart",
            volumeOz: 32,
            price: "13.00",
            description: "Ideal for small gatherings",
            sortOrder: 2,
        },
        {
            name: "Half Gallon",
            slug: "half-gallon",
            volumeOz: 64,
            price: "24.00",
            description: "Great for parties",
            sortOrder: 3,
        },
    ];

    const sizes = await db
        .insert(sizesTable)
        .values(sizeData)
        .onConflictDoNothing()
        .returning();
    console.log(`✅ Inserted ${sizes.length} sizes`);

    // --- Products (flavour × size combos) ---
    const allFlavours =
        flavours.length > 0
            ? flavours
            : await db.select().from(flavoursTable);
    const allSizes =
        sizes.length > 0 ? sizes : await db.select().from(sizesTable);

    const productData = allFlavours.flatMap((f) =>
        allSizes.map((s) => ({
            flavourId: f.id,
            sizeId: s.id,
            available: f.available,
        })),
    );

    const products = await db
        .insert(productsTable)
        .values(productData)
        .onConflictDoNothing()
        .returning();
    console.log(`✅ Generated ${products.length} products (flavour × size)`);

    // --- Locations ---
    const locationData = [
        {
            name: "Carlisle Pike, Mech PA",
            slug: "carlisle-pike",
            address: "6391 Carlisle Pike",
            city: "Mechanicsburg",
            state: "PA",
            zip: "17050",
            phone: "717-884-9396",
            accentColor: "#d4a853",
            mapUrl: "https://www.google.com/maps/search/?api=1&query=6391%20Carlisle%20Pike%2C%20Mechanicsburg%2C%20PENNSYLVANIA%2017050",
            menuUrl: "https://virtualscreen.optisigns.com/#VTJGc2RHVmtYMThuT25TNXZGWEJSZFVoUno3VkpqWnowYkdHYUUxM1MvVVNuNUEydjBXeDZHNmtVM3N4aUZPSGxkMG83NnUzZzBWTVJxbXRNdHN0TUE9PQ==",
            sortOrder: 1,
        },
        {
            name: "Carlisle Shop",
            slug: "carlisle",
            address: "258 Westminster Drive",
            city: "South Middleton Township",
            state: "PA",
            zip: "17013",
            phone: "717-884-9396",
            accentColor: "#A1AB74",
            mapUrl: "https://www.google.com/maps/search/?api=1&query=258%20Westminster%20Drive%2C%20South%20Middleton%20Township%2C%20PENNSYLVANIA%2017013",
            menuUrl: "https://virtualscreen.optisigns.com/#VTJGc2RHVmtYMTliUmJ1N2Y4Y3o1WkxPeFNaVjRYZVRrZGo1cXhJR0ZxMHZNMWpFcjlyY2VROTM3UkNDcXcvdUtYaEV0NU5NRGJwT21WNnBlWHY2blE9PQ==",
            sortOrder: 2,
        },
        {
            name: "Louise Drive, Mech PA",
            slug: "louise-drive",
            address: "4902 Louise Drive",
            city: "Mechanicsburg",
            state: "PA",
            zip: "17055",
            phone: "717-884-9396",
            accentColor: "#C4886D",
            mapUrl: "https://www.google.com/maps/search/?api=1&query=4902%20Louise%20Drive%2C%20Mechanicsburg%2C%20PENNSYLVANIA%2017055",
            menuUrl: "https://virtualscreen.optisigns.com/#VTJGc2RHVmtYMStqMUNlcUlzY1g4bThNTVlKVnpyZVFuUW82cDdHTXh0R1FOV3ZsOElxY2tGSjczMVFPSlhGcmllMTlicUFQQTU1b3g1Skp0eXhsb0E9PQ==",
            sortOrder: 3,
        },
        {
            name: "UC Harrisburg",
            slug: "harrisburg",
            address: "1004 N 3rd Street",
            city: "Harrisburg",
            state: "PA",
            zip: "17104",
            phone: "717-884-9396",
            accentColor: "#8B5E3C",
            mapUrl: "https://www.google.com/maps/search/?api=1&query=1004%20N%203rd%20Street%2C%20Harrisburg%2C%20PA%2017104",
            menuUrl: "https://virtualscreen.optisigns.com/#VTJGc2RHVmtYMThleG5Gd2llcEdRaFdaSUV6bzJHemxmK0MyQ2Q2L1FoeUt2M2luRmx2bmhmWGZYSVR5OGdQSlVJSWxBdTZ0blFqaFBWTXZFQURSN2c9PQ==",
            sortOrder: 4,
        },
    ];

    const locations = await db
        .insert(locationsTable)
        .values(locationData)
        .onConflictDoNothing()
        .returning();
    console.log(`✅ Inserted ${locations.length} locations`);

    // --- Location Hours ---
    const allLocations =
        locations.length > 0
            ? locations
            : await db.select().from(locationsTable);

    const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];

    const hoursData = allLocations.flatMap((loc) => {
        const isHarrisburg = loc.slug === "harrisburg";
        const isLouise = loc.slug === "louise-drive";
        return dayNames.map((_, dayIndex) => {
            // UC Harrisburg: Mon-Thu 2-9pm, Fri-Sat 12-9pm, Sun closed
            if (isHarrisburg) {
                if (dayIndex === 0) return { locationId: loc.id, dayOfWeek: dayIndex, openTime: "00:00", closeTime: "00:00", isClosed: true };
                if (dayIndex === 5 || dayIndex === 6) return { locationId: loc.id, dayOfWeek: dayIndex, openTime: "12:00", closeTime: "21:00", isClosed: false };
                return { locationId: loc.id, dayOfWeek: dayIndex, openTime: "14:00", closeTime: "21:00", isClosed: false };
            }
            // Louise Drive: Mon-Fri 7:30am-10pm, Sat 9am-10pm, Sun 9am-9pm
            if (isLouise) {
                if (dayIndex === 0) return { locationId: loc.id, dayOfWeek: dayIndex, openTime: "09:00", closeTime: "21:00", isClosed: false };
                if (dayIndex === 6) return { locationId: loc.id, dayOfWeek: dayIndex, openTime: "09:00", closeTime: "22:00", isClosed: false };
                return { locationId: loc.id, dayOfWeek: dayIndex, openTime: "07:30", closeTime: "22:00", isClosed: false };
            }
            // Carlisle Pike & Carlisle Shop: Mon-Sat 11am-10pm, Sun 11am-9pm
            if (dayIndex === 0) return { locationId: loc.id, dayOfWeek: dayIndex, openTime: "11:00", closeTime: "21:00", isClosed: false };
            return { locationId: loc.id, dayOfWeek: dayIndex, openTime: "11:00", closeTime: "22:00", isClosed: false };
        });
    });

    const hours = await db
        .insert(locationHoursTable)
        .values(hoursData)
        .onConflictDoNothing()
        .returning();
    console.log(`✅ Inserted ${hours.length} location hour entries`);

    // --- Product Pre-Orders ---

    // Helper: find flavour by slug
    const findFlavour = (slug: string) => allFlavours.find((f) => f.slug === slug);

    // Dates for open ice cream pre-orders
    const now = new Date();
    const openStart = new Date(now);
    openStart.setDate(openStart.getDate() - 3);
    const openEnd = new Date(now);
    openEnd.setDate(openEnd.getDate() + 11);
    const openPickup = new Date(openEnd);
    openPickup.setDate(openPickup.getDate() + 3);
    const openPickupEnd = new Date(openPickup);
    openPickupEnd.setDate(openPickupEnd.getDate() + 4);

    // Dates for closed (past) pre-orders
    const closedStart = new Date(now);
    closedStart.setDate(closedStart.getDate() - 45);
    const closedEnd = new Date(closedStart);
    closedEnd.setDate(closedEnd.getDate() + 14);
    const closedPickup = new Date(closedEnd);
    closedPickup.setDate(closedPickup.getDate() + 3);
    const closedPickupEnd = new Date(closedPickup);
    closedPickupEnd.setDate(closedPickupEnd.getDate() + 4);

    // Build per-flavour pre-order rows
    const preOrderData: {
        flavourId: number;
        preOrderStart: Date;
        preOrderEnd: Date;
        pickupDate: Date;
        pickupEndDate: Date;
        status: "open" | "scheduled" | "closed";
        isRecurring: boolean;
        adminNotified: boolean;
    }[] = [];

    // Open ice cream pre-orders (popular flavours)
    for (const slug of ["mint-chip", "truly-strawberry", "vanilla", "chocolate", "mango-habanero", "sweet-potato-casserole"]) {
        const flavour = findFlavour(slug);
        if (flavour) {
            preOrderData.push({
                flavourId: flavour.id,
                preOrderStart: openStart,
                preOrderEnd: openEnd,
                pickupDate: openPickup,
                pickupEndDate: openPickupEnd,
                status: "open",
                isRecurring: false,
                adminNotified: false,
            });
        }
    }

    // Closed ice cream pre-orders (winter flavors)
    for (const slug of ["sweet-potato-casserole", "vanilla", "chocolate"]) {
        const flavour = findFlavour(slug);
        if (flavour) {
            preOrderData.push({
                flavourId: flavour.id,
                preOrderStart: closedStart,
                preOrderEnd: closedEnd,
                pickupDate: closedPickup,
                pickupEndDate: closedPickupEnd,
                status: "closed",
                isRecurring: false,
                adminNotified: true,
            });
        }
    }

    const preOrders = await db
        .insert(productPreOrdersTable)
        .values(preOrderData)
        .onConflictDoNothing()
        .returning();
    console.log(`✅ Inserted ${preOrders.length} product pre-orders`);

    // --- Demo Bakery Orders ---
    const demoOrders = [
        {
            orderNumber: "UC-BAK-0001",
            customerName: "Sarah Mitchell",
            customerPhone: "717-555-0123",
            customerEmail: "sarah.m@example.com",
            pickupDate: closedPickup.toISOString().split("T")[0],
            pickupTime: "10:00 AM",
            orderType: "Custom Ice Cream Cake",
            orderDetails: {
                size: '8"',
                flavors: ["Vanilla", "Chocolate"],
                message: "Happy Birthday Emma!",
            },
            specialRequests: "Extra sprinkles on top",
            totalPriceCents: 4500,
            status: "completed" as const,
        },
        {
            orderNumber: "UC-BAK-0002",
            customerName: "James Chen",
            customerPhone: "717-555-0456",
            customerEmail: "j.chen@example.com",
            pickupDate: closedPickup.toISOString().split("T")[0],
            pickupTime: "2:00 PM",
            orderType: "Cupcakes by the Dozen",
            orderDetails: {
                quantity: 24,
                flavors: ["Mint Chip", "Truly Strawberry"],
            },
            specialRequests: "",
            totalPriceCents: 4800,
            status: "completed" as const,
        },
        {
            orderNumber: "UC-BAK-0003",
            customerName: "Linda Torres",
            customerPhone: "717-555-0789",
            customerEmail: "linda.t@example.com",
            pickupDate: closedPickupEnd.toISOString().split("T")[0],
            pickupTime: "11:00 AM",
            orderType: "Pre-Stacked Ice Cream Cake",
            orderDetails: {
                size: '10"',
                layers: ["Sweet Potato Casserole", "Vanilla"],
            },
            specialRequests:
                "Nut-free facility needed, please confirm allergens",
            totalPriceCents: 5500,
            status: "completed" as const,
        },
    ];

    const orders = await db
        .insert(bakeryOrdersTable)
        .values(demoOrders)
        .onConflictDoNothing()
        .returning();
    console.log(`✅ Inserted ${orders.length} demo bakery orders`);

    // --- Demo Events ---
    const tastingDate = new Date(now);
    tastingDate.setDate(tastingDate.getDate() + 14); // 2 weeks from now
    const popUpDate = new Date(now);
    popUpDate.setDate(popUpDate.getDate() + 21); // 3 weeks from now

    const harrisburgLocation = allLocations.find((l) => l.slug === "harrisburg");

    const eventData = [
        {
            title: "Summer Flavor Tasting",
            slug: "summer-flavor-tasting",
            description:
                "Join us for an exclusive tasting of our upcoming summer lineup! Sample 6 brand-new flavors before they hit the menu — including Mango Habanero, Summer Corn, and a few surprises. Each ticket includes a guided tasting flight, a take-home pint of your favorite, and a behind-the-scenes look at how we churn our small-batch ice cream.",
            imageUrl: null,
            locationId: harrisburgLocation?.id ?? null,
            venueName: "UC Harrisburg",
            venueAddress: "1004 N 3rd Street, Harrisburg, PA 17104",
            eventDate: tastingDate.toISOString().split("T")[0],
            startTime: "18:00",
            endTime: "20:00",
            category: "tasting" as const,
            status: "published" as const,
            isPrivate: false,
            accentColor: "#A1AB74",
            sortOrder: 1,
            active: true,
        },
        {
            title: "Urban Churn × Third Street Market Pop-Up",
            slug: "third-street-market-pop-up",
            description:
                "We're taking over a corner of the Third Street Market for a one-night pop-up! Grab scoops, sundaes, and affogatos made to order, plus limited-edition flavours only available at this event. Live music, good vibes, and plenty of ice cream — bring the whole family.",
            imageUrl: null,
            locationId: harrisburgLocation?.id ?? null,
            venueName: "Third Street Market",
            venueAddress: "1004 N 3rd Street, Harrisburg, PA 17104",
            eventDate: popUpDate.toISOString().split("T")[0],
            startTime: "16:00",
            endTime: "21:00",
            category: "pop_up" as const,
            status: "published" as const,
            isPrivate: false,
            accentColor: "#C4886D",
            sortOrder: 2,
            active: true,
        },
    ];

    const events = await db
        .insert(eventsTable)
        .values(eventData)
        .onConflictDoNothing()
        .returning();
    console.log(`✅ Inserted ${events.length} demo events`);

    // Add ticket types for each event
    if (events.length > 0) {
        const ticketTypeData = [];
        const tastingEvent = events.find((e) => e.slug === "summer-flavour-tasting");
        const popUpEvent = events.find((e) => e.slug === "third-street-market-pop-up");

        if (tastingEvent) {
            ticketTypeData.push(
                {
                    eventId: tastingEvent.id,
                    name: "General Admission",
                    description: "Tasting flight of 6 flavours + take-home pint",
                    priceCents: 2500,
                    quantity: 40,
                    quantitySold: 12,
                    maxPerOrder: 4,
                    sortOrder: 1,
                },
                {
                    eventId: tastingEvent.id,
                    name: "VIP — Early Access",
                    description: "30-min early entry, tasting flight, take-home quart, and an Urban Churn tote bag",
                    priceCents: 4500,
                    quantity: 15,
                    quantitySold: 5,
                    maxPerOrder: 2,
                    sortOrder: 2,
                },
            );
        }

        if (popUpEvent) {
            ticketTypeData.push(
                {
                    eventId: popUpEvent.id,
                    name: "Free Entry",
                    description: "General access — pay as you go at the pop-up",
                    priceCents: 0,
                    quantity: 200,
                    quantitySold: 34,
                    maxPerOrder: 6,
                    sortOrder: 1,
                },
                {
                    eventId: popUpEvent.id,
                    name: "Scoop Pass (5 scoops)",
                    description: "Prepaid pass for 5 scoops — skip the line!",
                    priceCents: 3000,
                    quantity: 50,
                    quantitySold: 8,
                    maxPerOrder: 4,
                    sortOrder: 2,
                },
            );
        }

        if (ticketTypeData.length > 0) {
            const ticketTypes = await db
                .insert(eventTicketTypesTable)
                .values(ticketTypeData)
                .onConflictDoNothing()
                .returning();
            console.log(`✅ Inserted ${ticketTypes.length} event ticket types`);
        }
    }

    console.log("\n🎉 Seed complete!");
    await pool.end();
}

seed().catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
});
