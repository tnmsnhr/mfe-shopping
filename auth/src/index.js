// Bootstrap pattern — async import creates module scope boundary
// so shared modules (React) are initialized before being consumed.
import("./bootstrap");
