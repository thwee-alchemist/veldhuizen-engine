# veldhuizen-engine

The veldhuizen-engine is a dynamic, force directed graph layout implemenation for the browser written in javascript. 

The following commands are used to set up the graph animation:

    veldhuizen_engine = new VeldhuizenEngine();
    veldhuizen_engine.init('#veldhuizen-engine', {
      width: window.width, 
      height: window.height, 
      window: window,
      resize: true
    });

    $('#zoom').change(function(){
      veldhuizen_engine.variables.zoom = $(this).val();
    });
    
This sets up a veldhuizen-engine in a div taking up the entire width and height of the screen. Other elements can be placed on top of this div, here #veldhuizen-engine.

The following functions are used to add and remove elements from the graph. 

    vertex = veldhuizen_engine.graph.add_vertex({
      size: 10,
      texture: 'path/to/picture'
    });
    
to create a vertex shown as a cube, and 

    edge = veldhuizen_engine.graph.add_edge(vertex1, vertex2);
    
to create an edge displayed as a line between the two vertice's cubes. Of course, the vertices and edges can also be removed using the commands

    veldhuizen_engine.graph.remove_vertex(vertex);
    velduizen_engine.graph.remove_edge(edge);
    
But if you don't want to keep track of vertices and edges in your own code, you can access them through the properties

    veldhuizen_engine.graph.V; // stores the vertices
    veldhuizen_engine.graph.E; // stores the edges

Both are dictionaries using the vertex's and edge's id property as keys. 

You might want to play with the options, which you can find under 

    veldhuizen_engine.variables
    
Enjoy!
    
