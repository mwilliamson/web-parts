A part is any function that accepts two arguments,
the name of the part and the rendering context.
A part should return either:

* an string containing HTML, or

* a composition of other parts using `webParts.compose`.
  Note that the same parts should always be returned for updating to work correctly.

These return values can also be wrapped in a promise.
