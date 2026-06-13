import { HashRouter, Routes, Route } from "react-router-dom"
import Home from "./Home"
import BoostCalculator from "./BoostCalculator"

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/boost" element={<BoostCalculator />} />
      </Routes>
    </HashRouter>
  )
}
