var take = function(vs){
  var sumLength = THREE.Vector3(0, 0, 0);
  for(var i=0; i<vs.length; i++){
    sum_length.add(vs[i].position.length());
  }
  // console.log(vs[i].id, ',', vs[i].attraction_forces.length(), ',', vs[i].repulsion_forces.length());
  return sum_length;
};

graph.add_edge(v1, v2);
setInterval(function(){
  take([v1, v2]);
}, 10);