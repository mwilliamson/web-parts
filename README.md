## Renderer

A renderer is created by calling `webParts.renderer(options)`,
where `options` is an object with the following properties:

* `parts`: a list of parts.

A renderer has the following methods:

* `render(partName, context)`: render the part with name `partName` using `context` as the context.
  Returns a string of HTML containing a single top-level `div`.
  Once this string has been parsed and turned into a DOM element,
  that top-level `div` is the element that should be passed into `update()`.

* `update(partName, context, element)`: update the given `element`.
  `element` should a DOM element that corresponds to the top-level `div` returned from `render()`.
  If the part is compositional, then each hole is updated as soon as it's ready.

  TODO: should the `partName` argument be removed?
  If not, we should properly handle the case where the partName changes
  i.e. start from scratch rather trying to update

## Parts

A part is an object with the following properties:

* `name`: the name for that part.
  All parts used in a renderer should have a unique name.

* `render`: any function that accepts two arguments,
  the name of the part and the rendering context.
  `render` should return either

    * an string containing HTML, or

    * a composition of other parts using `webParts.compose()`.

  These return values can also be wrapped in a promise.

* `template`: optional for compositional parts, ignored for other parts.

### Compositional parts

Compositional parts should return `webParts.compose(holes)` from the `render` function,
where `holes` should be a list of holes.
A compositional part should always return the same number of holes with the same names for updates to work correctly.

A hole is an object with the following properties:

* `name`: a name unique to this compositional part
* `part`: the name of the part that should be used to fill this hole
* `context`: the context that should be used by the part to fill this hole

HTML for each hole is then generated using the specified part and context.
If no template is set on the part,
then the final HTML for the compositional part is the concatenation of the HTML of each of the holes.
If a template is set,
then `template.fillHoles(holeContents)` is called to generate the final HTML.
`holeContents` is an object mapping the name of holes to the HTML generated for each hole.

### Example parts

#### Returning a string

```javascript
{
    name: "posts/body",
    render: function(name, context) {
        return '<h2>' + escapeHtml(context.body) '</h2>';
    }
}
```

#### Returning a composition

```javascript
{
    name: "posts/post",
    render: function(name, context) {
        return webParts.compose([
            {name: "body", part: "posts/body", context: context},
            {name: "comments": part: "posts/comments", context: context.comments}
        ])
    }
}
```
