import { NavLink } from "react-router-dom";

const links = [

    { name: "Dashboard", path: "/" },
    { name: "Upload PDF", path: "/upload" },
    { name: "AI Chat", path: "/chat" },
    { name: "Benchmark", path: "/benchmark" },
    { name: "Swagger", path: "/swagger" },
    { name: "Settings", path: "/settings" }

];

function Sidebar() {

    return (

        <aside className="w-64 bg-slate-800 text-white p-5">

            <h1 className="text-2xl font-bold text-cyan-400 mb-8">

                VectorForge

            </h1>

            <nav className="space-y-3">

                {links.map((link) => (

                    <NavLink
                        key={link.path}
                        to={link.path}
                        className={({ isActive }) =>
                            `block rounded-lg px-4 py-2 transition ${
                                isActive
                                    ? "bg-cyan-500 text-black font-semibold"
                                    : "hover:bg-slate-700"
                            }`
                        }
                    >
                        {link.name}
                    </NavLink>

                ))}

            </nav>

        </aside>

    );

}

export default Sidebar;