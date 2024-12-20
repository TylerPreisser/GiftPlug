async function submitForm() {
  const occasion = document.getElementById("occasion").value;
  const budget = document.getElementById("budget").value;
  const interest = document.getElementById("interest").value;
  const notes = document.getElementById("notes").value;

  const userInput = { occasion, budget, interest, notes };

  // Send data to the backend
  const response = await fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userInput),
  });

  const recommendations = await response.json();

  // Display recommendations
  const recommendationsDiv = document.getElementById("recommendations");
  recommendationsDiv.innerHTML = "";

  recommendations.forEach((product) => {
    const productHTML = `
      <div class="product">
        <h3>${product.title}</h3>
        <a href="${product.url}" target="_blank">
          <img src="${product.image}" alt="${product.title}">
        </a>
        <a href="${product.url}" target="_blank" class="buy-link">Buy on Amazon</a>
      </div>
    `;
    recommendationsDiv.innerHTML += productHTML;
  });
}
