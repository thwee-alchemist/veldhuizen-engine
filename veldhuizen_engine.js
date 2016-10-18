'use strict';
/*
  veldhuizen_engine.js
  Joshua M. Moore
 
  moore.joshua@protonmail.com
  October 2016
  
  
  Requirements:
  three.js, by MrDoob, see https://threejs.org/
  
  Usage: 
  veldhiuzen_engine = new VeldhuizenEngine();
  veldhuizen_engine.init('#veldhuizen_engine', {
    width: window.width,
    height: window.height,
    window: window,
    resize: true    
  });
  
  var vertex1 = veldhuizen_engine.graph.add_vertex({size: 10, texture: 'path/to/image'}); // add a vertex
  var vertex2 = veldhuizen_engine.graph.add_vertex({size: 10, texture: 'path/to/image'}); // add another vertex
  var edge = veldhuizen_engine.graph.add_edge(vertex1, vertex2, edge_options);
 
  veldhuizen_engine.graph.remove_edge(edge); // this is why you keep those variables
  veldhuizen_engine.graph.remove_vertex(vertex1);
  veldhuizen_engine.graph.remove_vertex(vertex2);
  ...
  
  // vertices: veldhuizen_engine.graph.V
  // edges: veldhuizen_engine.graph.E
  
  For more info, see:
  https://arxiv.org/abs/0712.1549
  
  
  Enjoy!
*/

var logslider = function(position){
  var minp = 0;
  var maxp = 100;
  
  var minv = Math.log(TODO_MIN);
  var maxv = Math.log(TODO_MAX);
  
  var scale = (maxv - minv) / (maxp - minp);
  
  return Math.exp(minv + scale*(position - minp))
};

var VeldhuizenEngine = function(){

  var that = this;
  var CONSTANTS = {
    width: 1000,
    attraction: 0.0025,
    far: 1000,
    optimal_distance: 1.0,
    minimum_velocity: 0.001,
    friction: 0.60,
    zoom: -500,

    gravity: 0.070,

    rangeMiIn: -1.0,
    rangeMaxIn: 1.0,
    rangeMinOut: -10,
    rangeMaxOut: 10,

    BHN3: {
      inner_distance: 0.036,
      repulsion: 100.0,
      epsilon: 0.1
    }
  };
  
  var is_vertex = function(potential){
    return potential.hasOwnProperty('id') && 
      potential.hasOwnProperty('edge_count') && 
      potential.hasOwnProperty('edges');
  };

  /* 
    Vertex
    
    Creates a vertex which can be passed to Graph. 
    setting a label property in the options parameter can allow
    for a label to be drawn above or below a vertex. 
    
    Options:
    - invisible
    - see cube
    - see label
    
  */
  var Vertex = function(id, options){
    this.options = options;
    this.id = Vertex.getID();
    
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acceleration = new THREE.Vector3(0, 0, 0);
    
    this.toString = function(){
      return this.id.toString();
    };

    this.edge_count = 0;
    this.edges = {};
    this.neighbors = [];
  };
  Vertex.ID = 0;
  Vertex.getID = function(){
    return ++Vertex.ID;
  };

  var label_position = function(vertex_position, size){
    var location = {
      x: vertex_position.x - Math.round(size / 2),
      y: vertex_position.y + size + Math.round(size/5),
      z: vertex_position.z
    };

    return location; 
  };

  Vertex.prototype.paint = function(scene){
    this.object = new Cube(scene, this.options);
    
    if(this.options && this.options.label){
      this.label_sprite = make_text_sprite(this.options.label.text, this.options.label);
      this.label_sprite.parent = this.object;
      this.label_sprite.position.y -= 10;
      //this.label_sprite.position = label_position(this.object.position, 5);
    }
    scene.add(this.object);
  };

  /*
  Vertex.prototype.update = function(){
    this.label_sprite.position = label_position(this.object.position, 5);
  };
  */
  
  /* 
    Vertex.remove(...) 
    removes either a label: Vertex.remove('label'),
    or the vertex's cube: Vertex.remove('cube').
  */ 
  Vertex.prototype.remove = function(){
    this.graph.remove_vertex(this);
  }

  // Edge
  var Edge = function(id, source, target, options){
    this.options = options === undefined ? {strength: 1.0} : options;
    
    if(arguments.length < 3){
      throw new Error('Edge without sufficent arguments');
    }

    if(!is_vertex(source)){
      var source_type = typeof source;
      var source_error_msg = 'Source should be a Vertex instead of a ' + src_type + '.';
      throw new Error(src_error_msg);
    }

    if(!is_vertex(target)){
      var target_type = typeof target;
      var target_error_msg = 'Target should be a Vertex instead of a ' + tgt_type + '.';
      throw new Error(tgt_error_msg);
    }

    this.id = id;
    if(this.options.hasOwnProperty('directed')){
      this.gravity = true;
    }

    this.source = source;
    this.target = target;

    this.source.edge_count += 1;
    this.target.edge_count += 1;

    this.source.edges[this.id] = this;
    this.target.edges[this.id] = this;

    this.order = Math.random();
  };

  Edge.prototype.paint = function(scene){
    this.object = line(scene, this.source, this.target, this.options);
  };

  Edge.prototype.toString = function(){
    return this.source.toString() + '-->' + this.target.toString(); 
  };

  Edge.prototype._destroy = function(scene){
    delete this.source.edges[this.id];
    delete this.target.edges[this.id];

    CONSTANTS.scene.remove(this.object);
    delete this.object;
    
    this.source.edge_count--;
    this.target.edge_count--;
  };
  
  Edge.prototype.remove = function(){
    this.graph.remove_vertex(this);
  };

  // Graph
  var Graph = function(scene){
    this.scene = scene;
    this.type = 'Graph';
    this.vertex_id_spawn = 0;
    this.V = {};

    this.edge_id_spawn = 0;
    this.E = {};

    this.edge_counts = {};
  };

  // api
  Graph.prototype.clear = function(){

    for(var e in this.E){
      this.E[e]._destroy(that.scene);
    }

    for(var v in this.V){
      // this.scene.remove...
      scene.remove(this.V[v].object);
      // this.V[v]._destroy();
    }
    
    this.V = {};
    this.E = {};
    this.edge_counts = {};
    this.edge_id_spawn = 0;
    this.vertex_id_spawn = 0;
  };

  Graph.prototype._make_key = function(source, target){
    return '_' + source.toString() + '_' + target.toString();
  };

  // api
  Graph.prototype.add_vertex = function(options){
    var vertex = new Vertex(this.vertex_id_spawn++, options);
    vertex.paint(this.scene);
    this.V[vertex.id] = vertex;
    
    vertex.graph = this;

    return vertex;
  };

  // api
  Graph.prototype.add_edge = function(source, target, options){
    if(source === undefined){
      throw Error('source vertex is undefined');
    }
    if(target === undefined){
      throw Error('target vertex is undefined');
    }
    
    var key = '_' + source.id + '_' + target.id;
    var edge;
    
    if(!this.edge_counts.hasOwnProperty(key)){
      edge = new Edge(this.edge_id_spawn++, source, target, options);
      this.E[edge.id] = edge;
      this.edge_counts[key] = 1;
    }else{
      this.edge_counts[key]++;
      for(var e in target.edges){
        for(var r in source.edges){
          if(e === r){
            return source.edges[r];
          }
        }
      }
    }
    
    edge.paint(this.scene);
    edge.graph = this;
    
    return edge;
  };

  // api
  Graph.prototype.remove_edge = function(edge){
    var key = this._make_key(edge.source, edge.target);
    if(--this.edge_counts[key] === 0){
      edge._destroy();
      delete this.E[edge.id];
    }
  };

  Graph.prototype.toString = function(){
    var edges = Object.keys(this.E).length;
    var nodes = Object.keys(this.V).length;

    return '|V|: ' + nodes.toString() + ',  |E|: ' + edges.toString();
  };

  // api
  Graph.prototype.remove_vertex = function(vertex){
    for(var e in vertex.edges){
      vertex.edges[e]._destroy(this.scene);  
      delete this.E[e];
    }
    
    this.scene.remove(vertex.object);
    delete this.V[vertex.id];
  };

  var is_graph = function(potential){
    return potential.type === 'Graph';
  };

  // apiish
  var Cube = function(scene, options){
    if(options === undefined){
      options = {};
    }
    
    if(options.size){
      options.width = options.size;
      options.height = options.size;
      options.depth = options.size;
    }else{      
      if(options.width === undefined){
        options.width = 3;
      }
      if(options.height === undefined){
        options.height = 3;
      }
      if(options.depth === undefined){
        options.depth = 3;
      }
    }
    
    if(options.color === undefined){
      options.color = 0x00ccaa;
    }
    
    if(options.wireframe === undefined){
      options.wireframe = false;
    }
    
    var geometry, material, material_args;
    geometry = new THREE.BoxGeometry(
      options.width,
      options.height,
      options.depth
    );
    geometry.dynamic = true;
    
    var cube;
    var geometry = new THREE.BoxGeometry(
      options.width,
      options.height,
      options.depth
    );
    var scale = 2;
    
    if(options.texture){
      var material = new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture(options.texture)
      });
    }else{
      var material = new THREE.MeshBasicMaterial({color: options.color});
    }
    
    cube = new THREE.Mesh(geometry, material);
    cube.position.copy(new THREE.Vector3(
      Math.random() * scale, 
      Math.random() * scale,
      Math.random() * scale
    ));
    cube.matrixAutoUpdate = true;
    scene.add(cube);

    return cube;
  };
  
  /*
    todo: a streamlined system for extracting options. 
    
    specifically:
      vertex_options.label and edge_options.label should be
      the same, and the label option should not conflict with 
      vertex- or edge- options.
      
    This system could be called an option extractor. I see a 
    stream of options being passed through the vertex and edge
    constructors and painters that takes the appropriate parts 
    of the options and applies them to the correct part in the 
    taxonomy of objects, i.e. vertex or label, or edge or label.
  */
  
  /*
    THREE.Sprite Label(parameters)
  
    label
    creates a label that can be added to a vertex or an edge.
    
    parameters
    - text
    - font_family      // optional: 'Arial'
    - font_size        // optional: 12
    - sprite_alignment // optional: top left
    
    returns
    a sprite
  */
  var Label = function( parameters ){
    if( parameters === undefined ){
      parameters = {};
    }
    
    if(!parameters.text === undefined){
      throw "Can't do a label without some text";
    }
    
    var font_family = parameters.hasOwnProperty('font_family') ? 
      parameters['font_family'] : 'Arial';
    var font_size = parameters.hasOwnProperty('font_size') ? 
      parameters['font_size'] : 12;
    // border thickness
    // border color
    // background color
    
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.font = "Bold " + font_size + "px " + font_family;
    
    // get size data (height depends only on font size)
    var metrics = context.measureText(parameters.text);
    var text_width = metrics.width;
    //context.fillStyle = "rgba(0,0,0,0)";
    //context.strokeStyle = "rgba(0,0,0,0)";
    
    //context.lineWidth = 0;
    context.fillStyle = "rgba(0, 0, 0, 1.0)";
    context.fillText(parameters.text ? parameters.text : '', 1, font_size);
    
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    
    var sprite_material = new THREE.SpriteMaterial(
      {
        map: texture, 
        useScreenCoordinates: false
      }
    );
    
    var sprite = new THREE.Sprite( sprite_material );
    // sprite.scale.set(100, 50, 1.0);

    return sprite;
  };

  // apiish this will change
  // todo: make line options like cube options
  var line = function(scene, source, target){
    var geometry = new THREE.Geometry();
    geometry.dynamic = true;
    geometry.vertices.push(source.object.position);
    geometry.vertices.push(target.object.position);
    geometry.verticesNeedUpdate = true;
    
    var material = new THREE.LineBasicMaterial({ color: 0x000000 });
    
    var line = new THREE.Line( geometry, material );
      
    scene.add(line);
    return line;
  };

  var BHN3 = function(){
    this.inners = [];
    this.outers = {};
    this.center_sum = new THREE.Vector3(0, 0, 0);
    this.center_count = 0;
  };

  BHN3.prototype.constants = CONSTANTS.BHN3;

  BHN3.prototype.center = function(){
    return this.center_sum.clone().divideScalar(this.center_count);
  };

  BHN3.prototype.place_inner = function(vertex){
    this.inners.push(vertex);
    this.center_sum.add(vertex.object.position);
    this.center_count += 1;
  };

  BHN3.prototype.get_octant = function(position){
    var center = this.center();
    var x = center.x < position.x ? 'l' : 'r';
    var y = center.y < position.y ? 'u' : 'd';
    var z = center.z < position.z ? 'i' : 'o';
    return x + y + z;
  };

  BHN3.prototype.place_outer = function(vertex){
    var octant = this.get_octant(vertex.object.position);
    this.outers[octant] = this.outers[octant] || new BHN3();
    this.outers[octant].insert(vertex);
  };

  BHN3.prototype.insert = function(vertex){
    if(this.inners.length === 0){
      this.place_inner(vertex);
    }else{
      if(this.center().distanceTo(vertex.object.position) <= this.constants.inner_distance){
        this.place_inner(vertex);
      }else{
        this.place_outer(vertex);
      }
    }
  };

  BHN3.prototype.estimate = function(vertex, force, force_fn){
    if(this.inners.indexOf(vertex) > -1){
      for(var i=0; i<this.inners.length; i++){
        if(vertex !== this.inners[i]){
          var individual_force = force_fn(
            vertex.object.position.clone(),
            this.inners[i].object.position.clone()
          );
	  
          force.add(individual_force);
        }
      }
    }else{
      var sumstimate = force_fn(vertex.object.position, this.center());
      sumstimate.multiplyScalar(this.center_count);
      force.add(sumstimate);
    }
    
    for(var octant in this.outers){
      this.outers[octant].estimate(vertex, force, force_fn);
    }
  };

  BHN3.prototype.pairwise_repulsion = function( x1, x2 ){

    var enumerator1, denominator1, 
      enumerator2, denominator2, 
      repulsion_constant, 
      difference, absolute_difference, 
      epsilon, product, 
      term1, term2,
      square, sum, result; 
    
    // first term
    enumerator1 = repulsion_constant = CONSTANTS.BHN3.repulsion;
    
    difference = x1.clone().sub(x2.clone());
    absolute_difference = difference.length();
    
    epsilon = CONSTANTS.BHN3.epsilon;
    sum = epsilon + absolute_difference;
    denominator1 = square = sum*sum;
    
    term1 = enumerator1 / denominator1;
    
    // second term
    enumerator2 = difference;
    denominator2 = absolute_difference;
    
    term2 = enumerator2.divideScalar(denominator2);
    
    // result
    result = term2.multiplyScalar(term1);  
    
    return result;
  };
  
  var edges = false;
  Graph.prototype.layout = function(){

    // calculate repulsions
    var tree = new BHN3();
    var vertex, edge, v, e;
    
    for(v in this.V){
      vertex = this.V[v];
      vertex.acceleration = new THREE.Vector3(0.0, 0.0, 0.0);
      vertex.repulsion_forces = new THREE.Vector3(0.0, 0.0, 0.0);
      vertex.attraction_forces = new THREE.Vector3(0.0, 0.0, 0.0);

      tree.insert(vertex);
    }
    
    for(v in this.V){
      vertex = this.V[v];
      vertex.repulsion_forces = vertex.repulsion_forces || new THREE.Vector3();
      vertex.repulsion_forces.set(0.0, 0.0, 0.0);
      tree.estimate(
        vertex, vertex.repulsion_forces,
        BHN3.prototype.pairwise_repulsion
      );
    }
    
    // calculate attractions
    
    for(e in this.E){
      edge = this.E[e];
      
      var attraction = edge.source.object.position.clone().sub(
        edge.target.object.position
      );
      attraction.multiplyScalar(-1 * CONSTANTS.attraction);

      // attraction.multiplyScalar(edge.options.strength);

      edge.source.attraction_forces.sub(attraction);
      edge.target.attraction_forces.add(attraction);

      if(edge.gravity){
        var gravity = new THREE.Vector3(0.0, -1 * CONSTANTS.gravity, 0.0);
        edge.target.acceleration.add(gravity);
      }
    }
    
    for(v in this.V){
      // update velocity
      vertex = this.V[v];
      if(vertex){
        var friction = vertex.velocity.multiplyScalar(CONSTANTS.friction);

        vertex.acceleration.add(
          vertex.repulsion_forces.clone().add(
            vertex.attraction_forces.clone().negate()
          )
        );
        vertex.acceleration.sub(friction);
        
        vertex.velocity.add(vertex.acceleration);
        vertex.object.position.add(vertex.velocity);
      }
    }
    
    for(e in this.E){
      edge = this.E[e];

      if(edge){  
        edge.object.geometry.dirty = true;
        edge.object.geometry.__dirty = true;
        edge.object.geometry.verticesNeedUpdate = true;
      }
    }

    this.center = tree.center();
  };
  
  this._internals = {};
  var scene,
      element,
      camera,
      light,
      renderer,
      graph;

  var render = function render(){
    requestAnimationFrame(render);
    graph.layout();
    renderer.render(scene, camera);
    camera.position.z = graph.center.z - CONSTANTS.zoom;
    camera.lookAt(graph.center);
  };

  var clear = function clear(){
    graph.clear();
  };
  
  // api
  this.init = function(selector, options){

    scene = new THREE.Scene();
    element = document.querySelector(selector);
    if(!element){
      throw "element " + selector + " wasn't found on the page.";
    }
    camera = new THREE.PerspectiveCamera(
      70,
      options.width / options.height,
      1,
      CONSTANTS.far
    );    
    
    light = new THREE.PointLight( 0xf0df0d ); // soft white light
    
    CONSTANTS.scene = scene;
    scene.add( camera );
    scene.add( light );
    
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xefefef);
    renderer.setSize( options.width, options.height );
    
    var onWindowResize = function(){
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(options.window.innerWidth, options.window.innerHeight);
    };
    onWindowResize();

    document.querySelector(selector).appendChild( renderer.domElement );
    
    graph = new Graph(scene);
    
    camera.position.z = -250;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    that._internals = {
      scene: scene,
      element: element,
      camera: camera,
      light: light,
      renderer: renderer,
      graph: graph,
      window: options.window
    };

    if(options.resize){
      options.window.addEventListener('resize', onWindowResize, false);
    }

    // api
    this.graph = graph;
    this.render = render;
    this.clear = clear;
    this.variables = CONSTANTS;
    

    render();
  };
  
  this._internals = {
    Vertex: Vertex,
    Edge: Edge,
    Graph: Graph,
    BHN3: BHN3,
  };

  // untested
  this.setCubeFn = function(fn){
    cube = fn;
  };

  this.setLineFn = function(fn){
    line = fn;
  };
  // end untested
  
  return this;
};
