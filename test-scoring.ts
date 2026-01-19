// Test script to verify scoring function
import { scorePost } from "./src/lib/scoring";

console.log("Testing scoring function with various inputs...\n");

// Test 1: Normal input
try {
    const result1 = scorePost("Selling my SaaS business", "Making $5k MRR, looking to sell", "SaaS");
    console.log("✅ Test 1 passed:", result1.viabilityScore);
} catch (e) {
    console.error("❌ Test 1 failed:", e);
}

// Test 2: Empty strings
try {
    const result2 = scorePost("", "", "");
    console.log("✅ Test 2 passed:", result2.viabilityScore);
} catch (e) {
    console.error("❌ Test 2 failed:", e);
}

// Test 3: Null/undefined (should be caught by our fixes)
try {
    const result3 = scorePost(null as any, undefined as any, "test");
    console.log("✅ Test 3 passed:", result3.viabilityScore);
} catch (e) {
    console.error("❌ Test 3 failed:", e);
}

// Test 4: Post with no revenue info
try {
    const result4 = scorePost("Looking to sell my business", "It's a good business", "smallbusiness");
    console.log("✅ Test 4 passed:", result4.viabilityScore);
} catch (e) {
    console.error("❌ Test 4 failed:", e);
}

console.log("\nAll tests completed!");
