// eslint-disable-next-line no-unused-vars
function animate() {
  const elm = document.querySelector(".framework-icon");
  setTimeout(() => {
    elm.classList.toggle("animate");
    setTimeout(() => {
      elm.classList.toggle("animate");
      setTimeout(() => {
        animate();
      }, 1000);
    }, 3000);
  }, 200);
}

animate();
