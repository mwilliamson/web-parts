A part is an object with the following properties:

* `name`: the name for that part.
  All parts used in a renderer should have a unique name.

* `render`: any function that accepts two arguments,
  the name of the part and the rendering context.
  `render` should return either

    * an string containing HTML, or

    * a composition of other parts using `webParts.compose()`.
      Note that the same holes should always be returned for updating to work correctly.

  These return values can also be wrapped in a promise.

* `template`: only used for compositional parts.
  If set, `template.fillHoles(holeContents)` is called to generate the final HTML string for that part.
  `holeContents` is an object mapping the name of holes to the HTML generated for each hole.

## Composing parts

To compose parts together, a part should call `webParts.compose()`.

## Example parts

### Returning a string

```javascript
{
    name: "posts/body",
    render: function(name, context) {
        return '<h2>' + escapeHtml(context.body) '</h2>';
    }
}
```

### Returning a composition

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
