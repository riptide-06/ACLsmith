import { mountHome } from './routes/home';
import { mountApp } from './routes/app';

type Teardown = () => void;

const root = document.getElementById('app');
if (!root) throw new Error('#app mount point missing from index.html');

let teardown: Teardown | null = null;

function route() {
  if (teardown) {
    teardown();
    teardown = null;
  }
  root!.innerHTML = '';

  if (window.location.hash === '#/app') {
    teardown = mountApp(root!);
  } else {
    teardown = mountHome(root!);
  }
}

window.addEventListener('hashchange', route);
route();
