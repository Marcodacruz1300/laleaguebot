const { Octokit } = require("@octokit/rest");

exports.handler = async (event) => {
  try {
    // Parse le corps JSON envoyé par le formulaire
    const { title, price, description, imageBase64, imageName } = JSON.parse(event.body);

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Upload image vers GitHub
    const imagePath = `assets/uploads/${imageName}`;
    await octokit.repos.createOrUpdateFileContents({
      owner: "Marcodacruz1300",
      repo: "stonr",
      path: imagePath,
      message: `Upload image ${imageName}`,
      content: imageBase64,
      branch: "main"
    });

    // Créer le fichier produit en Markdown
    const mdContent = `---
title: "${title}"
price: ${price}
description: "${description}"
image: "/${imagePath}"
published: true
---
`;

    const productPath = `content/produits/${title.replace(/\s+/g, "-").toLowerCase()}.md`;
    await octokit.repos.createOrUpdateFileContents({
      owner: "Marcodacruz1300",
      repo: "stonr",
      path: productPath,
      message: `Ajout produit ${title}`,
      content: Buffer.from(mdContent).toString("base64"),
      branch: "main"
    });

    return { statusCode: 200, body: "Produit ajouté avec succès !" };
  } catch (err) {
    return { statusCode: 500, body: "Erreur: " + err.message };
  }
};
