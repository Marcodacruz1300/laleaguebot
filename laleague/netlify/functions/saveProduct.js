const { Octokit } = require("@octokit/rest");
const matter = require("gray-matter");

const OWNER = "Marcodacruz1300";
const REPO = "stonr";
const BRANCH = "main";
const PRODUCTS_DIR = "content/produits";
const PRODUCTS_JSON = "products.json";
const IMAGES_DIR = "content/images"; // dossier pour stocker les images

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { title, price, description, imageBase64, imageName, originalSlug, image } = body;

    if (!title || !price || !description) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: { name: "ValidationError", message: "title, price et description requis" } })
      };
    }

    const slug = originalSlug || title.toLowerCase().replace(/\s+/g, "-");
    const filePath = `${PRODUCTS_DIR}/${slug}.md`;

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // --- 1) Upload de l'image si fournie ---
    let imageUrl = image || "";
    if (imageBase64 && imageName) {
      const imagePath = `${IMAGES_DIR}/${Date.now()}-${imageName}`;
      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path: imagePath,
        message: `Upload image ${imageName}`,
        content: imageBase64, // déjà en base64 depuis le front
        branch: BRANCH
      });
      imageUrl = `/${imagePath}`; // chemin relatif utilisable côté site
    }

    // --- 2) Sauvegarde du fichier produit en .md ---
    const content = matter.stringify(description, {
      title,
      price,
      description,
      image: imageUrl,
      published: true
    });

    let sha = null;
    try {
      const { data: file } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: filePath,
        ref: BRANCH
      });
      sha = file.sha;
    } catch (err) {
      if (err.status !== 404) throw err;
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      message: sha ? `Update product ${slug}` : `Create product ${slug}`,
      content: Buffer.from(content).toString("base64"),
      branch: BRANCH,
      sha: sha || undefined
    });

    // --- 3) Mise à jour du products.json ---
    let productsSha = null;
    let products = [];
    try {
      const { data: jsonFile } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: PRODUCTS_JSON,
        ref: BRANCH
      });
      productsSha = jsonFile.sha;
      const jsonContent = Buffer.from(jsonFile.content, "base64").toString("utf8");
      products = JSON.parse(jsonContent);
    } catch (err) {
      if (err.status !== 404) throw err;
      products = [];
    }

    const productData = { slug, title, price, description, image: imageUrl };
    const existingIndex = products.findIndex(p => p.slug === slug);
    if (existingIndex >= 0) {
      products[existingIndex] = productData;
    } else {
      products.push(productData);
    }

    const newJsonContent = JSON.stringify(products, null, 2);

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: PRODUCTS_JSON,
      message: "Update products.json",
      content: Buffer.from(newJsonContent).toString("base64"),
      branch: BRANCH,
      sha: productsSha || undefined
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: sha ? "Produit mis à jour" : "Produit créé", slug })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: { name: err.name || "Error", message: err.message } })
    };
  }
};
