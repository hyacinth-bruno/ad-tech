import { calculateAnalytics } from "../lib/storeAnalytics";
import type { StoreEvent } from "../models/StoreEvent";

function event(input: Partial<StoreEvent>): StoreEvent {
  return { eventId: "event", type: "search", userToken: "shop-test-user", query: "headphones", category: "Audio", objectIDs: [], quantity: 1,
    createdAt: new Date(), insightsStatus: "not_configured", ...input };
}
it("attributes rates to unique searches and keeps repeated actions from inflating CTR", () => {
  const analytics = calculateAnalytics([
    event({ eventId: "s1", totalHits: 12 }), event({ eventId: "s2", totalHits: 0, query: "unfindable" }),
    event({ eventId: "c1", type: "click", searchId: "s1", position: 2, objectID: "p1", productName: "Headphones", insightsStatus: "sent" }),
    event({ eventId: "c2", type: "click", searchId: "s1", position: 4, objectID: "p1", productName: "Headphones", insightsStatus: "sent" }),
    event({ eventId: "c3", type: "cart", searchId: "s1", objectID: "p1", productName: "Headphones" }),
    event({ eventId: "p1", type: "purchase", searchId: "s1", objectID: "p1", productName: "Headphones", price: 49.99, quantity: 2, orderId: "order-one" }),
    event({ eventId: "orphan", type: "click", searchId: "outside-period", objectID: "p2" }),
  ], [{ totalCents: 4999 }, { totalCents: 1001 }], 7);
  expect(analytics.searches).toBe(2);
  expect(analytics.noResultsRate).toBe(0.5);
  expect(analytics.clickThroughRate).toBe(0.5);
  expect(analytics.addToCartRate).toBe(0.5);
  expect(analytics.purchaseRate).toBe(0.5);
  expect(analytics.averageClickPosition).toBe(3);
  expect(analytics.revenueCents).toBe(6000);
  expect(analytics.averageOrderValueCents).toBe(3000);
  expect(analytics.noResults).toEqual([{ query: "unfindable", count: 1 }]);
  expect(analytics.insights.sent).toBe(2);
  expect(analytics.categories[0]).toMatchObject({ category: "Audio", noResultsRate: 0.5, clickThroughRate: 0.5, addToCartRate: 0.5, purchaseRate: 0.5, revenueCents: 9998, averageOrderValueCents: 9998 });
});
it("returns honest empty analytics without invented baseline activity", () => {
  const analytics = calculateAnalytics([], [], 30);
  expect(analytics.searches).toBe(0);
  expect(analytics.clickThroughRate).toBe(0);
  expect(analytics.averageClickPosition).toBeNull();
  expect(analytics.revenueCents).toBe(0);
  expect(analytics.daily).toEqual([]);
});
