import re

with open('src/components/CreateObservationModal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add props
code = code.replace(
    'currentDbhCm?: number | null;',
    'currentDbhCm?: number | null;\n  treeLatitude?: number | null;\n  treeLongitude?: number | null;'
)

code = code.replace(
    '  currentDbhCm,\n  onSuccess,',
    '  currentDbhCm,\n  treeLatitude,\n  treeLongitude,\n  onSuccess,'
)

state_to_insert = '''  const [distanceToTree, setDistanceToTree] = useState<number | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) * 1000;
  };
'''
code = code.replace('  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);', '  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);\n' + state_to_insert)

code = code.replace(
    'setGpsAccuracy(Math.round(pos.coords.accuracy));',
    'setGpsAccuracy(Math.round(pos.coords.accuracy));\n          if (treeLatitude && treeLongitude) {\n            setDistanceToTree(calculateDistance(pos.coords.latitude, pos.coords.longitude, treeLatitude, treeLongitude));\n          }'
)

new_ui = '''{/* GPS Verification */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-card/60 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <div className="text-xs">
                  {latitude && longitude ? (
                    <span className="font-mono text-foreground font-medium">
                      {latitude.toFixed(6)}, {longitude.toFixed(6)} (+/-{gpsAccuracy}m)
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Capture current GPS location</span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCaptureGps}
                disabled={isCapturingGps}
                className="text-xs h-8"
              >
                {isCapturingGps ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <MapPin className="h-3.5 w-3.5 mr-1" />}
                {latitude ? "Update GPS" : "Capture GPS"}
              </Button>
            </div>
            
            {distanceToTree !== null && (
              <div className={	ext-xs font-semibold px-2 py-1.5 rounded-lg flex items-center gap-1.5 }>
                 {distanceToTree <= 50 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                 {distanceToTree <= 50 ? VERIFIED: You are within m of the tree's registered location. : LOCATION MISMATCH: You are m away from the tree's registered location.}
              </div>
            )}
          </div>

          <DialogFooter'''

code = re.sub(r'\{\/\* GPS Verification \*\/\}.*?\<DialogFooter', new_ui, code, flags=re.DOTALL)

with open('src/components/CreateObservationModal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

