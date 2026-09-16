// iOS 13+ gates the device orientation and motion events behind a permission
// prompt that has to be triggered from a user gesture. `requestPermission` is
// the API for it; it is WebKit-only and has never made it into lib.dom.
//
// lib.dom declares the two constructors as anonymous type literals, which
// nothing can merge into, so this declares the extra member on its own and the
// accelerometer hook intersects it at the point of use.
interface PermissionRequestableEventConstructor {
  requestPermission?: () => Promise<PermissionState>;
}
