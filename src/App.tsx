import { HashRouter, Routes, Route } from "react-router-dom"
import Home from "./Home"
import BoostCalculator from "./BoostCalculator"
import BoostRippleCalculator from "./BoostRippleCalculator"

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/boost" element={<BoostCalculator />} />
        <Route path="/boost-ripple" element={<BoostRippleCalculator />} />
      </Routes>
    </HashRouter>
  )
}
