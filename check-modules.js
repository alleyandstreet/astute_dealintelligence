try {
    require('framer-motion');
    console.log('framer-motion: OK');
} catch (e) {
    console.log('framer-motion: MISSING');
}

try {
    require('lucide-react');
    console.log('lucide-react: OK');
} catch (e) {
    console.log('lucide-react: MISSING');
}

try {
    require('sonner');
    console.log('sonner: OK');
} catch (e) {
    console.log('sonner: MISSING');
}

try {
    require('next-auth/react');
    console.log('next-auth/react: OK');
} catch (e) {
    // next-auth/react might not be directly require-able in node if it's ESM only or client side
    console.log('next-auth/react: ' + e.message);
    try {
        require('next-auth');
        console.log('next-auth: OK');
    } catch (e2) {
        console.log('next-auth: MISSING');
    }
}
