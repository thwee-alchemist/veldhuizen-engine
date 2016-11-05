'use strict';
/*
  veldhuizen_engine.js
  Joshua M. Moore
 
  moore.joshua@protonmail.com
  October 2016
  
  
  Requirements:
  three.js, by MrDoob, see https://threejs.org/
  release 66
  
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
    far: 100000,
    optimal_distance: 100.0,
    minimum_velocity: 0.0002,
    friction: 0.00750,
    zoom: 4000,

    BHN3: {
      inner_distance: 100.0,
      repulsion: 50.0,
      epsilon: 0.00001
    }
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
    
    this.position = new THREE.Vector3(0.0, 0.0, 0.0);
    this.velocity = new THREE.Vector3(0.0, 0.0, 0.0);
    this.acceleration = new THREE.Vector3(0.0, 0.0, 0.0);
    this.repulsion_forces = new THREE.Vector3(0.0, 0.0, 0.0);
    this.attraction_forces = new THREE.Vector3(0.0, 0.0, 0.0);

    
    this.toString = function(){
      return this.id.toString();
    };

    this.edges = [];
    this.neighbors = [];
  };
  Vertex.ID = 0;
  Vertex.getID = function(){
    return ++Vertex.ID;
  };

  Vertex.prototype.paint = function(scene){
    this.object = new Cube(scene, this.options);
    scene.add(this.object);
  };
  
  /* 
    Vertex.remove(...) 
    removes either a label: Vertex.remove('label'),
    or the vertex's cube: Vertex.remove('cube').
  */ 
  Vertex.prototype.remove = function(){
    // for(var i=0; i<this.edges.length; i++){
      // this.edges[i].remove();
    // }
    
    for(var i in this.edges){
      this.edges[i].remove();
    }
    
    this.graph.scene.remove(this.object);
    this.object.geometry.dispose();
    remove(this.graph.V, this);
    // console.log('Vertex removed     #' + this.id + ' V:' + this.graph.V.length + ' E:' + this.graph.E.length);
  }

  // Edge
  var Edge = function(id, source, target, options){
    this.options = options === undefined ? {strength: 1.0} : options;
    
    if(arguments.length < 3){
      throw new Error('Edge without sufficent arguments');
    }

    this.id = id;
    if(this.options.hasOwnProperty('directed')){
      this.gravity = true;
    }

    this.source = source;
    this.target = target;

    this.source.edges.push(this);
    this.target.edges.push(this);

    this.order = Math.random();
  };

  Edge.prototype.paint = function(){
    this.object = Line(scene, this.source, this.target, this.options);
  };
  
  Edge.prototype.refresh = function(){
    this.scene.remove(this.object);
    this.object.geometry.dispose();
    delete this.object;
    this.object = Line(scene, this.source, this.target, this.options);
  };
  
  Edge.prototype.update = function(){
    this.object.geometry.vertices[0].copy(this.source.object.position);
    this.object.geometry.vertices[1].copy(this.target.object.position);
    this.object.geometry.verticesNeedUpdate = true;
  };

  Edge.prototype.toString = function(){
    return this.source.toString() + '-->' + this.target.toString(); 
  };
  
  var remove = function(arr, item){
    arr.splice(arr.indexOf(item), 1);
  };
  
  Edge.prototype.remove = function(){
    remove(this.source.edges, this);
    remove(this.target.edges, this);
    remove(this.graph.E, this);
    
    this.graph.scene.remove(this.object);
    this.object.geometry.dispose();
    delete this.object;
    
    // console.log('  Edge removed (' + this.source.id + ', ' + this.target.id + ') V:' + this.graph.V.length + ' E:' + this.graph.E.length);
  };

  // Graph
  var Graph = function(scene){
    this.scene = scene;
    this.type = 'Graph';
    
    this.vertex_id_spawn = 0;
    this.V = [];

    this.edge_id_spawn = 0;
    this.E = [];
  };

  // api
  Graph.prototype.clear = function(){

    for(var i=0; i<this.E.length; i++){
      this.E[i]._destroy(this.scene);
    }
    
    for(var i=0; i<this.V.length; i++){
      scene.remove(this.V[i].object);
    }
    
    // probably unneccessary
    this.V = []; 
    this.E = [];
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
    this.V.push(vertex);
    
    vertex.graph = this;

    // console.log('Vertex   added     #' + vertex.id + ' V:' + this.V.length + ' E:' + this.E.length);
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
    
    edge = new Edge(this.edge_id_spawn++, source, target, options);
    edge.scene = this.scene;
    edge.graph = this;
    
    this.E.push(edge);
    edge.paint();
    
    // console.log('  Edge   added (' + edge.source.id + ', ' + edge.target.id + ') V:' + this.V.length + ' E:' + this.E.length);
    
    return edge;
  };

  Graph.prototype.toString = function(){
    var edges = this.E.length;
    var nodes = this.V.length;
    
    return '|V|: ' + nodes.toString() + ',  |E|: ' + edges.toString();
  };

  // api
  Graph.prototype.remove_vertex = function(vertex){    
    vertex.remove();
  };
  
  Graph.prototype.remove_edge = function(edge){
    edge.remove();
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
    // geometry.dynamic = true;
    
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
    cube.position.set(
      Math.random() * scale, 
      Math.random() * scale,
      Math.random() * scale
    );
    //cube.matrixAutoUpdate = true;
    scene.add(cube);

    return cube;
  };

  var Line = function(scene, source, target){
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
    
    for(var i=0; i<this.V.length; i++){
      var vertex = this.V[i];
      tree.insert(vertex);
    }
    
    for(var i=0; i<this.V.length; i++){
      var vertex = this.V[i];
      vertex.repulsion_forces = vertex.repulsion_forces || new THREE.Vector3();
      vertex.repulsion_forces.set(0.0, 0.0, 0.0);
      tree.estimate(
        vertex, vertex.repulsion_forces,
        BHN3.prototype.pairwise_repulsion
      );
    }
    
    // calculate attractions
    
    for(var i=0; i<this.E.length; i++){
      var edge = this.E[i];
      
      var attraction = edge.source.object.position.clone().sub(
        edge.target.object.position
      );
      attraction.multiplyScalar(-1 * CONSTANTS.attraction);
      
      /*
      if(!edge.source.hasOwnProperty('attraction_forces')){
        edge.source.attraction_forces = new THREE.Vector3(0.0, 0.0, 0.0);
      }
      if(!edge.target.hasOwnProperty('attraction_forces')){
        edge.target.attraction_forces = new THREE.Vector3(0.0, 0.0, 0.0);
      }
      */

      // attraction.multiplyScalar(edge.options.strength);
      edge.source.attraction_forces.sub(attraction);
      edge.target.attraction_forces.add(attraction);
    }
    
    for(var i=0; i<this.V.length; i++){
      // update velocity
      var vertex = this.V[i];
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
        
        for(var j in vertex.edges){
          vertex.edges[j].object.geometry.verticesNeedUpdate = true;
        }
      }
    }
    
    /*
    for(var i=0; i<this.E.length; i++){
      var edge = this.E[i];
      edge.update();
      // edge.refresh();
      
      // edge.object.geometry.vertices[0].copy(edge.source.object.position);
      // edge.object.geometry.vertices[1].copy(edge.target.object.position);
      // edge.object.geometry.dirty = true;
      // edge.object.geometry.__dirty = true;
      // edge.object.geometry.verticesNeedUpdate = true;
    }
    */

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
    for(var i=0; i<that.render_functions.length; i++){
      that.render_functions[i]();
    }
    
    requestAnimationFrame(render);
    
    graph.layout();
    renderer.render(scene, camera);
    // camera.position.z = graph.center.z - CONSTANTS.zoom;
    // camera.lookAt(graph.center);
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
    
    renderer = new THREE.WebGLRenderer(); // WebGLRenderer
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
    
    camera.position.z = -CONSTANTS.zoom; // move to render() for real time update
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
    this.render_functions = [];
    this.renderer = renderer;
    this.camera = camera;
    
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
