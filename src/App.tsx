import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "./Home"
import BoostCalculator from "./BoostCalculator"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/calc-tools-v2/" element={<Home />} />
        <Route path="/calc-tools-v2/boost" element={<BoostCalculator />} />
      </Routes>
    </BrowserRouter>
  )
}
