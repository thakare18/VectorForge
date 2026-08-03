import Navbar from "./NavBar";
import Sidebar from "./Sidebar";

function Layout({ children }) {

    return (

        <div className="flex min-h-screen bg-slate-900">

            <Sidebar />

            <div className="flex-1 flex flex-col">

                <Navbar />

                <main className="p-6">

                    {children}

                </main>

            </div>

        </div>

    );

}

export default Layout;