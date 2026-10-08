const fs = require('fs');
let code = fs.readFileSync('src/pages/TreeMap.tsx', 'utf8');

// Import react-leaflet-cluster and project boundaries
code = code.replace(
    'import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";',
    'import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from "react-leaflet";\nimport MarkerClusterGroup from "react-leaflet-cluster";'
);

code = code.replace(
    'const fetchTrees = async () => {',
    'const fetchProjects = async () => {\n  const { data, error } = await supabase.from("projects").select("id, name");\n  if (error) throw error;\n  return data || [];\n};\n\nconst fetchBoundaries = async () => {\n  const { data, error } = await supabase.from("project_boundaries").select("id, project_id, boundary_geojson");\n  if (error) throw error;\n  return data || [];\n};\n\nconst fetchTrees = async () => {'
);

code = code.replace(
    '    const { data: trees = [], isLoading } = useQuery({\n      queryKey: ["trees"],\n      queryFn: fetchTrees,\n    });',
    '    const { data: trees = [], isLoading } = useQuery({\n      queryKey: ["trees"],\n      queryFn: fetchTrees,\n    });\n\n    const { data: projects = [] } = useQuery({\n      queryKey: ["projects"],\n      queryFn: fetchProjects,\n    });\n\n    const { data: boundaries = [] } = useQuery({\n      queryKey: ["project_boundaries"],\n      queryFn: fetchBoundaries,\n    });'
);

const mapReplacement = \                    <MapContainer
                      center={center}
                      zoom={treesWithCoords.length > 0 ? 8 : 6}
                      scrollWheelZoom
                      style={{ height: "620px", width: "100%" }}
                    >
                      <TileLayer
                        attribution={BASEMAP_TILES[basemap].attribution}
                        url={BASEMAP_TILES[basemap].url}
                        maxZoom={19}
                      />

                      <MapCenterController
                        center={center}
                        zoom={treesWithCoords.length > 0 ? 8 : 6}
                      />

                      {boundaries.map((b) => {
                         if (!b.boundary_geojson || !b.boundary_geojson.features) return null;
                         const feature = b.boundary_geojson.features[0];
                         if (!feature || !feature.geometry || !feature.geometry.coordinates) return null;
                         
                         const coords = feature.geometry.type === "Polygon" ? feature.geometry.coordinates[0].map((c) => [c[1], c[0]]) : [];
                         if (coords.length < 3) return null;
                         
                         const proj = projects.find(p => p.id === b.project_id);
                         return (
                           <Polygon key={b.id} positions={coords} pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.1, weight: 2 }}>
                             <Popup>
                               <div className="text-xs font-semibold">{proj ? proj.name : "Compartment"}</div>
                               <div className="text-[10px] text-muted-foreground">Project Boundary</div>
                             </Popup>
                           </Polygon>
                         );
                      })}

                      <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
                      {treesWithCoords.map((t) => {
                        const isVerified = t.verification_status === "verified";
                        const isRejected = t.verification_status === "rejected";

                        return (
                          <Fragment key={t.id}>
                            {showProximityRings && (
                              <Circle
                                center={[t.latitude!, t.longitude!]}
                                radius={5}
                                pathOptions={{
                                  color: isVerified
                                    ? "#22c55e"
                                    : isRejected
                                    ? "#ef4444"
                                    : "#f59e0b",
                                  fillColor: isVerified
                                    ? "#22c55e"
                                    : isRejected
                                    ? "#ef4444"
                                    : "#f59e0b",
                                  fillOpacity: 0.2,
                                  weight: 1,
                                }}
                              />
                            )}
                            <Marker position={[t.latitude!, t.longitude!]} icon={getIcon(t.verification_status || "pending")}>
                              <Popup className="rounded-xl overflow-hidden shadow-xl border-0 p-0 m-0 custom-popup-container">
                                <div className="w-56 p-0 m-0">
                                  {t.photo_url ? (
                                    <div className="h-28 w-full bg-muted relative overflow-hidden">
                                      <img
                                        src={t.photo_url}
                                        alt="Tree"
                                        className="w-full h-full object-cover"
                                      />
                                      {t.admin_status === "special" && (
                                        <div className="absolute top-2 right-2 bg-purple-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                          SPECIAL
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="h-24 bg-muted/60 flex items-center justify-center relative">
                                      <TreePine className="h-8 w-8 text-muted-foreground/30" />
                                    </div>
                                  )}

                                  <div className="p-3 space-y-2">
                                    <div className="space-y-0.5">
                                      <h4 className="font-bold text-sm font-heading leading-tight truncate">
                                        {t.tree_name || t.species || "Unidentified Tree"}
                                      </h4>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        ID: {t.tree_code || t.id.split("-")[0].toUpperCase()} • {t.species}
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/40">
                                      <div className="flex flex-col">
                                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Status</span>
                                        <div className="flex items-center gap-1 mt-0.5">
                                          <div className={"h-2 w-2 rounded-full " + (isVerified ? "bg-emerald-500" : isRejected ? "bg-red-500" : "bg-amber-500")} />
                                          <span className="text-[10px] font-medium capitalize truncate">
                                            {t.verification_status || "Pending"}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col">
                                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">AI Conf</span>
                                        <span className="text-[11px] font-mono font-medium mt-0.5">
                                          {t.ai_confidence ? t.ai_confidence + "%" : "N/A"}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="pt-2">
                                      <Link to={"/tree/" + t.id}>
                                        <Button size="sm" className="w-full h-7 text-[10px] rounded-lg gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 transition-colors shadow-none">
                                          <Search className="h-3 w-3" /> View Full Profile
                                        </Button>
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </Popup>
                            </Marker>
                          </Fragment>
                        );
                      })}
                      </MarkerClusterGroup>
                    </MapContainer>\;

code = code.replace(/<MapContainer[\s\S]*?<\/MapContainer>/, mapReplacement);

fs.writeFileSync('src/pages/TreeMap.tsx', code);
