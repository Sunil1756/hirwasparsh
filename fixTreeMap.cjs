const fs = require('fs');
let code = fs.readFileSync('src/pages/TreeMap.tsx', 'utf8');

code = code.replace(
    'import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";',
    'import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from "react-leaflet";\nimport MarkerClusterGroup from "react-leaflet-cluster";'
);

code = code.replace(
    'const fetchTrees = async () => {',
    'const fetchProjects = async () => {\n  const { data, error } = await supabase.from("projects").select("id, name");\n  if (error) throw error;\n  return data || [];\n};\n\nconst fetchBoundaries = async () => {\n  const { data, error } = await supabase.from("project_boundaries").select("id, project_id, boundary_geojson");\n  if (error) throw error;\n  return data || [];\n};\n\nconst fetchTrees = async () => {'
);

code = code.replace(
    '    const { data: trees = [], isLoading } = useQuery({\n      queryKey: [\"trees\"],\n      queryFn: fetchTrees,\n    });',
    '    const { data: trees = [], isLoading } = useQuery({\n      queryKey: [\"trees\"],\n      queryFn: fetchTrees,\n    });\n\n    const { data: projects = [] } = useQuery({\n      queryKey: [\"projects\"],\n      queryFn: fetchProjects,\n    });\n\n    const { data: boundaries = [] } = useQuery({\n      queryKey: [\"project_boundaries\"],\n      queryFn: fetchBoundaries,\n    });'
);

const mapReplacement = "" +
"                    <MapContainer\n" +
"                      center={center}\n" +
"                      zoom={treesWithCoords.length > 0 ? 8 : 6}\n" +
"                      scrollWheelZoom\n" +
"                      style={{ height: \"620px\", width: \"100%\" }}\n" +
"                    >\n" +
"                      <TileLayer\n" +
"                        attribution={BASEMAP_TILES[basemap].attribution}\n" +
"                        url={BASEMAP_TILES[basemap].url}\n" +
"                        maxZoom={19}\n" +
"                      />\n\n" +
"                      <MapCenterController\n" +
"                        center={center}\n" +
"                        zoom={treesWithCoords.length > 0 ? 8 : 6}\n" +
"                      />\n\n" +
"                      {boundaries.map((b) => {\n" +
"                         if (!b.boundary_geojson || !b.boundary_geojson.features) return null;\n" +
"                         const feature = b.boundary_geojson.features[0];\n" +
"                         if (!feature || !feature.geometry || !feature.geometry.coordinates) return null;\n" +
"                         \n" +
"                         const coords = feature.geometry.type === \"Polygon\" ? feature.geometry.coordinates[0].map((c) => [c[1], c[0]]) : [];\n" +
"                         if (coords.length < 3) return null;\n" +
"                         \n" +
"                         const proj = projects.find(p => p.id === b.project_id);\n" +
"                         return (\n" +
"                           <Polygon key={b.id} positions={coords} pathOptions={{ color: \"#3b82f6\", fillColor: \"#3b82f6\", fillOpacity: 0.1, weight: 2 }}>\n" +
"                             <Popup>\n" +
"                               <div className=\"text-xs font-semibold\">{proj ? proj.name : \"Compartment\"}</div>\n" +
"                               <div className=\"text-[10px] text-muted-foreground\">Project Boundary</div>\n" +
"                             </Popup>\n" +
"                           </Polygon>\n" +
"                         );\n" +
"                      })}\n\n" +
"                      <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>\n" +
"                      {treesWithCoords.map((t) => {\n" +
"                        const isVerified = t.verification_status === \"verified\";\n" +
"                        const isRejected = t.verification_status === \"rejected\";\n\n" +
"                        return (\n" +
"                          <Fragment key={t.id}>\n" +
"                            {showProximityRings && (\n" +
"                              <Circle\n" +
"                                center={[t.latitude, t.longitude]}\n" +
"                                radius={5}\n" +
"                                pathOptions={{\n" +
"                                  color: isVerified\n" +
"                                    ? \"#22c55e\"\n" +
"                                    : isRejected\n" +
"                                    ? \"#ef4444\"\n" +
"                                    : \"#f59e0b\",\n" +
"                                  fillColor: isVerified\n" +
"                                    ? \"#22c55e\"\n" +
"                                    : isRejected\n" +
"                                    ? \"#ef4444\"\n" +
"                                    : \"#f59e0b\",\n" +
"                                  fillOpacity: 0.2,\n" +
"                                  weight: 1,\n" +
"                                }}\n" +
"                              />\n" +
"                            )}\n" +
"                            <Marker position={[t.latitude, t.longitude]} icon={getIcon(t.verification_status || \"pending\")}>\n" +
"                              <Popup className=\"rounded-xl overflow-hidden shadow-xl border-0 p-0 m-0 custom-popup-container\">\n" +
"                                <div className=\"w-56 p-0 m-0\">\n" +
"                                  {t.photo_url ? (\n" +
"                                    <div className=\"h-28 w-full bg-muted relative overflow-hidden\">\n" +
"                                      <img\n" +
"                                        src={t.photo_url}\n" +
"                                        alt=\"Tree\"\n" +
"                                        className=\"w-full h-full object-cover\"\n" +
"                                      />\n" +
"                                      {t.admin_status === \"special\" && (\n" +
"                                        <div className=\"absolute top-2 right-2 bg-purple-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm\">\n" +
"                                          SPECIAL\n" +
"                                        </div>\n" +
"                                      )}\n" +
"                                    </div>\n" +
"                                  ) : (\n" +
"                                    <div className=\"h-24 bg-muted/60 flex items-center justify-center relative\">\n" +
"                                      <TreePine className=\"h-8 w-8 text-muted-foreground/30\" />\n" +
"                                    </div>\n" +
"                                  )}\n\n" +
"                                  <div className=\"p-3 space-y-2\">\n" +
"                                    <div className=\"space-y-0.5\">\n" +
"                                      <h4 className=\"font-bold text-sm font-heading leading-tight truncate\">\n" +
"                                        {t.tree_name || t.species || \"Unidentified Tree\"}\n" +
"                                      </h4>\n" +
"                                      <p className=\"text-[10px] text-muted-foreground truncate\">\n" +
"                                        ID: {t.tree_code || t.id.split(\"-\")[0].toUpperCase()} • {t.species}\n" +
"                                      </p>\n" +
"                                    </div>\n\n" +
"                                    <div className=\"grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/40\">\n" +
"                                      <div className=\"flex flex-col\">\n" +
"                                        <span className=\"text-[9px] uppercase tracking-wider text-muted-foreground font-semibold\">Status</span>\n" +
"                                        <div className=\"flex items-center gap-1 mt-0.5\">\n" +
"                                          <div className={\"h-2 w-2 rounded-full \" + (isVerified ? \"bg-emerald-500\" : isRejected ? \"bg-red-500\" : \"bg-amber-500\")} />\n" +
"                                          <span className=\"text-[10px] font-medium capitalize truncate\">\n" +
"                                            {t.verification_status || \"Pending\"}\n" +
"                                          </span>\n" +
"                                        </div>\n" +
"                                      </div>\n" +
"                                      \n" +
"                                      <div className=\"flex flex-col\">\n" +
"                                        <span className=\"text-[9px] uppercase tracking-wider text-muted-foreground font-semibold\">AI Conf</span>\n" +
"                                        <span className=\"text-[11px] font-mono font-medium mt-0.5\">\n" +
"                                          {t.ai_confidence ? t.ai_confidence + \"%\" : \"N/A\"}\n" +
"                                        </span>\n" +
"                                      </div>\n" +
"                                    </div>\n\n" +
"                                    <div className=\"pt-2\">\n" +
"                                      <Link to={\"/tree/\" + t.id}>\n" +
"                                        <Button size=\"sm\" className=\"w-full h-7 text-[10px] rounded-lg gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 transition-colors shadow-none\">\n" +
"                                          <Search className=\"h-3 w-3\" /> View Full Profile\n" +
"                                        </Button>\n" +
"                                      </Link>\n" +
"                                    </div>\n" +
"                                  </div>\n" +
"                                </div>\n" +
"                              </Popup>\n" +
"                            </Marker>\n" +
"                          </Fragment>\n" +
"                        );\n" +
"                      })}\n" +
"                      </MarkerClusterGroup>\n" +
"                    </MapContainer>";

code = code.replace(/<MapContainer[\s\S]*?<\/MapContainer>/, mapReplacement);

fs.writeFileSync('src/pages/TreeMap.tsx', code);
