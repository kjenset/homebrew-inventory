import AddBeer from './pages/AddBeer';
import EditBeer from './pages/EditBeer';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import Documentation from './pages/Documentation';
import PublicMenu from './pages/PublicMenu';
import RFID from './pages/RFID';
import EmptyBatches from './pages/EmptyBatches';
import Dashboard from './pages/Dashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddBeer": AddBeer,
    "EditBeer": EditBeer,
    "Activity": Activity,
    "Settings": Settings,
    "Documentation": Documentation,
    "PublicMenu": PublicMenu,
    "RFID": RFID,
    "EmptyBatches": EmptyBatches,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "AddBeer",
    Pages: PAGES,
    Layout: __Layout,
};