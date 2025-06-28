import { nip19, SimplePool } from "nostr-tools";

// Your public key
const pubkey =
  "c6e230a25ead3c497013637bf377bced81c7cdb60d881a63edb138b08aa68083";

// Popular Nostr relays
const relays = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://nostr-pub.wellorder.net",
  "wss://relay.snort.social",
  "wss://relay.primal.net",
  "wss://offchain.pub",
];

async function getAllEventsByAuthor() {
  const pool = new SimplePool();

  try {
    console.log(`Searching for events from pubkey: ${pubkey}`);
    console.log(`npub format: ${nip19.npubEncode(pubkey)}\n`);

    // Query all events from this author
    const events = await pool.querySync(relays, {
      authors: [pubkey],
      //   limit: 100, // Adjust limit as needed
    });

    console.log(`Found ${events.length} events total\n`);

    // Group events by kind for better organization
    const eventsByKind = {};
    events.forEach((event) => {
      if (!eventsByKind[event.kind]) {
        eventsByKind[event.kind] = [];
      }
      eventsByKind[event.kind].push(event);
    });

    // Display events organized by kind
    Object.keys(eventsByKind)
      .sort((a, b) => a - b)
      .forEach((kind) => {
        const kindEvents = eventsByKind[kind];
        console.log(`\n=== KIND ${kind} EVENTS (${kindEvents.length}) ===`);
        console.log(getKindDescription(parseInt(kind)));

        kindEvents.forEach((event, index) => {
          console.log(`\n--- Event ${index + 1} ---`);
          console.log(`ID: ${event.id}`);
          console.log(
            `Created: ${new Date(event.created_at * 1000).toISOString()}`
          );
          console.log(`Tags: ${JSON.stringify(event.tags)}`);

          // Show content preview (truncated for readability)
          const content =
            event.content.length > 200
              ? event.content.substring(0, 200) + "..."
              : event.content;
          console.log(`Content: ${content}`);
        });
      });

    return events;
  } catch (error) {
    console.error("Error querying events:", error);
  } finally {
    pool.close(relays);
  }
}

// Get events of specific kind only
async function getEventsByKind(kind) {
  const pool = new SimplePool();

  try {
    console.log(`Searching for kind ${kind} events from pubkey: ${pubkey}`);

    const events = await pool.querySync(relays, {
      authors: [pubkey],
      kinds: [kind],
      limit: 50,
    });

    console.log(`Found ${events.length} events of kind ${kind}`);
    console.log(getKindDescription(kind));

    events.forEach((event, index) => {
      console.log(`\n--- Event ${index + 1} ---`);
      console.log(`ID: ${event.id}`);
      console.log(
        `Created: ${new Date(event.created_at * 1000).toISOString()}`
      );
      console.log(`Content: ${event.content}`);
      if (event.tags.length > 0) {
        console.log(`Tags: ${JSON.stringify(event.tags)}`);
      }
    });

    return events;
  } catch (error) {
    console.error("Error querying events:", error);
  } finally {
    pool.close(relays);
  }
}

// Get recent events with real-time subscription
async function subscribeToNewEvents() {
  const pool = new SimplePool();

  console.log(`Subscribing to new events from pubkey: ${pubkey}`);

  const sub = pool.subscribeMany(
    relays,
    [
      {
        authors: [pubkey],
        since: Math.floor(Date.now() / 1000), // Only events from now
      },
    ],
    {
      onevent(event) {
        console.log("\n🆕 NEW EVENT RECEIVED:");
        console.log(`Kind: ${event.kind} (${getKindDescription(event.kind)})`);
        console.log(`ID: ${event.id}`);
        console.log(
          `Created: ${new Date(event.created_at * 1000).toISOString()}`
        );
        console.log(`Content: ${event.content}`);
      },
      oneose() {
        console.log("End of stored events, now listening for new ones...");
      },
    }
  );

  // Keep subscription open for 30 seconds
  setTimeout(() => {
    sub.close();
    pool.close(relays);
    console.log("\nSubscription closed");
  }, 30000);
}

// Helper function to describe event kinds
function getKindDescription(kind) {
  const descriptions = {
    0: "User Metadata/Profile",
    1: "Text Notes (Posts)",
    2: "Recommend Relay",
    3: "Contact List",
    4: "Encrypted Direct Messages",
    5: "Event Deletion",
    6: "Repost",
    7: "Reaction (Like)",
    8: "Badge Award",
    16: "Generic Repost",
    40: "Channel Creation",
    41: "Channel Metadata",
    42: "Channel Message",
    43: "Channel Hide Message",
    44: "Channel Mute User",
    1063: "File Metadata",
    1311: "Live Chat Message",
    1984: "Reporting",
    9734: "Zap Request",
    9735: "Zap",
    10000: "Mute List",
    10001: "Pin List",
    10002: "Relay List Metadata",
    30000: "Categorized People List",
    30001: "Categorized Bookmark List",
    30023: "Long-form Content",
  };

  return descriptions[kind] || "Unknown/Custom Event Kind";
}

// Main execution
async function main() {
  console.log("=".repeat(60));
  console.log("NOSTR EVENT QUERY TOOL");
  console.log("=".repeat(60));

  // Get all events
  const allEvents = await getAllEventsByAuthor();

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  if (allEvents && allEvents.length > 0) {
    console.log(`Total events found: ${allEvents.length}`);
    console.log(
      `Date range: ${new Date(
        Math.min(...allEvents.map((e) => e.created_at)) * 1000
      ).toISOString()} to ${new Date(
        Math.max(...allEvents.map((e) => e.created_at)) * 1000
      ).toISOString()}`
    );

    // Show event kind distribution
    const kindCounts = {};
    allEvents.forEach((event) => {
      kindCounts[event.kind] = (kindCounts[event.kind] || 0) + 1;
    });

    console.log("\nEvent distribution by kind:");
    Object.entries(kindCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([kind, count]) => {
        console.log(
          `  Kind ${kind}: ${count} events (${getKindDescription(
            parseInt(kind)
          )})`
        );
      });
  } else {
    console.log("No events found for this public key.");
    console.log("This could mean:");
    console.log("- The public key has not published any events");
    console.log("- The events are not available on the queried relays");
    console.log("- The public key format is incorrect");
  }
}

// Uncomment the function you want to run:

// Run main function to get all events
main();

// Or get specific kind only (uncomment and specify kind):
// getEventsByKind(1); // Get only text notes

// Or subscribe to new events (uncomment):
// subscribeToNewEvents();
