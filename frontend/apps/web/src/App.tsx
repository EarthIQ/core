import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { moduleRoutes, moduleNavItems } from "./modules.generated";

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        {moduleNavItems.map((item) => (
          <Link key={item.to} to={item.to}>
            {item.label}
          </Link>
        ))}
      </nav>
      <Routes>
        <Route path="/" element={<h1>Core App Shell</h1>} />
        {moduleRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={<r.Component />} />
        ))}
      </Routes>
    </BrowserRouter>
  );
}
