const fs = require('fs');
let code = fs.readFileSync('src/components/CreateObservationModal.tsx', 'utf8');

code = code.replace(
    'currentDbhCm?: number | null;',
    'currentDbhCm?: number | null;\n  treeLatitude?: number | null;\n  treeLongitude?: number | null;'
);

code = code.replace(
    '  currentDbhCm,\n  onSuccess,',
    '  currentDbhCm,\n  treeLatitude,\n  treeLongitude,\n  onSuccess,'
);

const state_to_insert = "  const [distanceToTree, setDistanceToTree] = useState<number | null>(null);\n\n" +
  "  const calculateDistance = (lat1, lon1, lat2, lon2) => {\n" +
  "    const R = 6371;\n" +
  "    const dLat = (lat2 - lat1) * (Math.PI / 180);\n" +
  "    const dLon = (lon2 - lon1) * (Math.PI / 180);\n" +
  "    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);\n" +
  "    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) * 1000;\n" +
  "  };";

code = code.replace('  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);', '  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);\n' + state_to_insert);

code = code.replace(
    'setGpsAccuracy(Math.round(pos.coords.accuracy));',
    'setGpsAccuracy(Math.round(pos.coords.accuracy));\n          if (treeLatitude && treeLongitude) {\n            setDistanceToTree(calculateDistance(pos.coords.latitude, pos.coords.longitude, treeLatitude, treeLongitude));\n          }'
);

const new_ui = "{/* GPS Verification */}\n" +
"          <div className=\"flex flex-col gap-2 p-3 rounded-xl bg-card/60 border border-border\">\n" +
"            <div className=\"flex items-center justify-between\">\n" +
"              <div className=\"flex items-center gap-2\">\n" +
"                <MapPin className=\"h-4 w-4 text-primary\" />\n" +
"                <div className=\"text-xs\">\n" +
"                  {latitude && longitude ? (\n" +
"                    <span className=\"font-mono text-foreground font-medium\">\n" +
"                      {latitude.toFixed(6)}, {longitude.toFixed(6)} (+/-{gpsAccuracy}m)\n" +
"                    </span>\n" +
"                  ) : (\n" +
"                    <span className=\"text-muted-foreground\">Capture current GPS location</span>\n" +
"                  )}\n" +
"                </div>\n" +
"              </div>\n" +
"              <Button\n" +
"                type=\"button\"\n" +
"                variant=\"outline\"\n" +
"                size=\"sm\"\n" +
"                onClick={handleCaptureGps}\n" +
"                disabled={isCapturingGps}\n" +
"                className=\"text-xs h-8\"\n" +
"              >\n" +
"                {isCapturingGps ? <Loader2 className=\"h-3.5 w-3.5 animate-spin mr-1\" /> : <MapPin className=\"h-3.5 w-3.5 mr-1\" />}\n" +
"                {latitude ? \"Update GPS\" : \"Capture GPS\"}\n" +
"              </Button>\n" +
"            </div>\n" +
"            \n" +
"            {distanceToTree !== null && (\n" +
"              <div className={\"text-xs font-semibold px-2 py-1.5 rounded-lg flex items-center gap-1.5 \" + (distanceToTree <= 50 ? \"bg-emerald-500/15 text-emerald-500\" : \"bg-destructive/15 text-destructive\")}>\n" +
"                 {distanceToTree <= 50 ? <CheckCircle2 className=\"h-3.5 w-3.5\" /> : <AlertTriangle className=\"h-3.5 w-3.5\" />}\n" +
"                 {distanceToTree <= 50 ? \"VERIFIED: You are within \" + Math.round(distanceToTree) + \"m of the tree's registered location.\" : \"LOCATION MISMATCH: You are \" + Math.round(distanceToTree) + \"m away from the tree's registered location.\"}\n" +
"              </div>\n" +
"            )}\n" +
"          </div>\n\n" +
"          <DialogFooter";

code = code.replace(/\{\/\* GPS Verification \*\/\}.*?\<DialogFooter/s, new_ui);

fs.writeFileSync('src/components/CreateObservationModal.tsx', code);
