import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Leaf, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const monthlyData = [
  { month: "Jan", trees: 820 }, { month: "Feb", trees: 1250 }, { month: "Mar", trees: 1680 },
  { month: "Apr", trees: 2100 }, { month: "May", trees: 1900 }, { month: "Jun", trees: 2400 },
  { month: "Jul", trees: 2800 }, { month: "Aug", trees: 3200 }, { month: "Sep", trees: 2600 },
  { month: "Oct", trees: 1800 }, { month: "Nov", trees: 1400 }, { month: "Dec", trees: 1200 },
];

const co2Data = [
  { month: "Jan", co2: 450 }, { month: "Feb", co2: 680 }, { month: "Mar", co2: 920 },
  { month: "Apr", co2: 1150 }, { month: "May", co2: 1350 }, { month: "Jun", co2: 1680 },
];

const regionData = [
  { name: "Maharashtra", value: 4200 }, { name: "Karnataka", value: 3100 },
  { name: "Tamil Nadu", value: 2800 }, { name: "Delhi NCR", value: 1900 },
  { name: "Gujarat", value: 1500 },
];

const COLORS = ["hsl(125,56%,24%)", "hsl(122,39%,49%)", "hsl(199,92%,64%)", "hsl(150,40%,50%)", "hsl(30,40%,45%)"];

const ndviData = [
  { month: "Jan", before: 0.32, after: 0.35 }, { month: "Feb", before: 0.33, after: 0.38 },
  { month: "Mar", before: 0.31, after: 0.42 }, { month: "Apr", before: 0.34, after: 0.48 },
  { month: "May", before: 0.35, after: 0.52 }, { month: "Jun", before: 0.36, after: 0.58 },
];

const Analytics = () => (
  <div className="min-h-screen pt-24 pb-12">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-4">
            <BarChart3 className="h-4 w-4" /> Environmental Analytics
          </div>
          <h1 className="font-heading text-4xl font-bold mb-2">Environmental Impact Dashboard</h1>
          <p className="text-muted-foreground">Real-time environmental analytics and insights</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Trees Planted Over Time */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Trees Planted Over Time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="trees" fill="hsl(125,56%,24%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* CO2 Absorption */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Leaf className="h-5 w-5 text-primary" /> CO₂ Absorption (tons)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={co2Data}>
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Area type="monotone" dataKey="co2" stroke="hsl(122,39%,49%)" fill="hsl(122,39%,49%,0.2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Regions */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Top Regions</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={regionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                  {regionData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* NDVI Vegetation Index */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> NDVI Vegetation Index</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={ndviData}>
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0.2, 0.7]} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Line type="monotone" dataKey="before" stroke="hsl(var(--muted-foreground))" strokeWidth={2} name="Before Plantation" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="after" stroke="hsl(125,56%,24%)" strokeWidth={2} name="After Plantation" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

export default Analytics;
