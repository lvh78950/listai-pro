// ── TAB PDF MODIFIER ──────────────────────────────────────────────────────────
// À intégrer dans App.jsx de ListAI Pro
// 1. Ajouter dans TABS : {id:"pdf",icon:"📄",label:"PDF"}
// 2. Ajouter dans COMPONENTS : pdf:<TabPDF dark={dark}/>
// 3. Ajouter dans HOME_CARDS : {id:"pdf",icon:"📄",label:"Modifier un PDF",sub:"Factures, fiches, étiquettes",grad:"linear-gradient(135deg,#0EA5E9,#7C3AED)",shadow:"rgba(14,165,233,0.4)"}
// 4. Importer jspdf en haut du fichier ou via CDN (voir note en bas)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from "react";

// ─── Réutilise les constantes/helpers de l'app principale ───
// (GOLD, ORANGE, BLUE, GRAD, GRAD_O, T, Card, Label, Title, Btn, Inp, Txta, Spin, Toast sont disponibles globalement)

// ─── Types de documents disponibles ───
const PDF_TEMPLATES = [
  {
    id: "facture",
    icon: "🧾",
    label: "Facture / Reçu",
    desc: "Facture de vente avec articles",
    color: "#7C3AED",
    grad: "linear-gradient(135deg,#7C3AED,#2563EB)",
    fields: [
      { id: "vendeur_nom",    label: "Nom du vendeur",      type: "text",   placeholder: "Ex: Marie Dupont",          required: true,  section: "Vendeur" },
      { id: "vendeur_email",  label: "Email vendeur",       type: "email",  placeholder: "marie@email.com",           required: false, section: "Vendeur" },
      { id: "vendeur_tel",    label: "Téléphone",           type: "text",   placeholder: "06 00 00 00 00",            required: false, section: "Vendeur" },
      { id: "acheteur_nom",   label: "Nom de l'acheteur",   type: "text",   placeholder: "Ex: Jean Martin",           required: true,  section: "Acheteur" },
      { id: "acheteur_email", label: "Email acheteur",      type: "email",  placeholder: "jean@email.com",            required: false, section: "Acheteur" },
      { id: "facture_num",    label: "N° de facture",       type: "text",   placeholder: "Ex: FAC-2024-001",          required: true,  section: "Facture" },
      { id: "date_facture",   label: "Date",                type: "date",   placeholder: "",                          required: true,  section: "Facture" },
      { id: "article_nom",    label: "Article vendu",       type: "text",   placeholder: "Ex: Veste en cuir noire S", required: true,  section: "Article" },
      { id: "article_desc",   label: "Description",         type: "textarea",placeholder: "État, marque, taille...", required: false, section: "Article" },
      { id: "prix_ht",        label: "Prix (€)",            type: "number", placeholder: "25.00",                     required: true,  section: "Article" },
      { id: "plateforme",     label: "Plateforme de vente", type: "select", options: ["Vinted","Leboncoin","eBay","Depop","Vestiaire","Autre"], required: false, section: "Article" },
      { id: "mode_paiement",  label: "Mode de paiement",   type: "select", options: ["Virement","Paypal","Lydia","Espèces","CB","Autre"], required: false, section: "Paiement" },
      { id: "notes",          label: "Notes / Conditions",  type: "textarea",placeholder: "Retours non acceptés...", required: false, section: "Notes" },
    ]
  },
  {
    id: "fiche_article",
    icon: "🏷️",
    label: "Fiche Article",
    desc: "Fiche produit détaillée",
    color: "#FF6B2B",
    grad: "linear-gradient(135deg,#FF6B2B,#FF9500)",
    fields: [
      { id: "titre",      label: "Titre de l'article",   type: "text",    placeholder: "Ex: Nike Air Max 90 Blanc T42",  required: true,  section: "Article" },
      { id: "marque",     label: "Marque",               type: "text",    placeholder: "Nike",                           required: false, section: "Article" },
      { id: "taille",     label: "Taille",               type: "text",    placeholder: "M / 40 / 10 ans...",             required: false, section: "Article" },
      { id: "couleur",    label: "Couleur",              type: "text",    placeholder: "Blanc cassé",                    required: false, section: "Article" },
      { id: "matiere",    label: "Matière",              type: "text",    placeholder: "100% coton",                     required: false, section: "Article" },
      { id: "etat",       label: "État",                 type: "select",  options: ["Neuf avec étiquette","Neuf sans étiquette","Très bon état","Bon état","Satisfaisant"], required: true, section: "Article" },
      { id: "prix",       label: "Prix demandé (€)",     type: "number",  placeholder: "35.00",                          required: true,  section: "Prix" },
      { id: "prix_achat", label: "Prix d'achat (€)",     type: "number",  placeholder: "15.00",                          required: false, section: "Prix" },
      { id: "plateforme", label: "Plateforme",           type: "select",  options: ["Vinted","Leboncoin","eBay","Depop","Vestiaire","Autre"], required: false, section: "Prix" },
      { id: "description",label: "Description",          type: "textarea",placeholder: "Décris l'article en détail...", required: false, section: "Détails" },
      { id: "hashtags",   label: "Hashtags",             type: "text",    placeholder: "#nike #airmax #basket",          required: false, section: "Détails" },
      { id: "ref_interne",label: "Réf. interne",         type: "text",    placeholder: "Ex: BOX-042",                    required: false, section: "Détails" },
    ]
  },
  {
    id: "etiquette",
    icon: "📦",
    label: "Étiquette Colis",
    desc: "Étiquette d'expédition",
    color: "#059669",
    grad: "linear-gradient(135deg,#059669,#10B981)",
    fields: [
      { id: "expediteur_nom",    label: "Expéditeur — Nom",    type: "text",  placeholder: "Marie Dupont",       required: true,  section: "Expéditeur" },
      { id: "expediteur_adresse",label: "Adresse",             type: "textarea",placeholder: "12 rue des Lilas\n75001 Paris", required: true, section: "Expéditeur" },
      { id: "expediteur_tel",    label: "Téléphone",           type: "text",  placeholder: "06 00 00 00 00",     required: false, section: "Expéditeur" },
      { id: "dest_nom",          label: "Destinataire — Nom",  type: "text",  placeholder: "Jean Martin",        required: true,  section: "Destinataire" },
      { id: "dest_adresse",      label: "Adresse",             type: "textarea",placeholder: "5 av. Victor Hugo\n69000 Lyon", required: true, section: "Destinataire" },
      { id: "dest_tel",          label: "Téléphone",           type: "text",  placeholder: "07 00 00 00 00",     required: false, section: "Destinataire" },
      { id: "transporteur",      label: "Transporteur",        type: "select",options: ["Colissimo","Mondial Relay","Chronopost","DHL","Lettre suivie","Autre"], required: true, section: "Envoi" },
      { id: "poids",             label: "Poids estimé (kg)",   type: "number",placeholder: "0.5",                required: false, section: "Envoi" },
      { id: "ref_colis",         label: "Référence colis",     type: "text",  placeholder: "REF-001",            required: false, section: "Envoi" },
      { id: "contenu",           label: "Contenu du colis",    type: "text",  placeholder: "Vêtements",          required: false, section: "Envoi" },
      { id: "notes_exp",         label: "Instructions",        type: "textarea",placeholder: "Fragile, ne pas plier...", required: false, section: "Envoi" },
    ]
  },
  {
    id: "contrat",
    icon: "📋",
    label: "Accord de vente",
    desc: "Contrat entre vendeur et acheteur",
    color: "#2563EB",
    grad: "linear-gradient(135deg,#2563EB,#06B6D4)",
    fields: [
      { id: "vendeur_nom",    label: "Vendeur — Nom complet",    type: "text",   placeholder: "Marie Dupont",         required: true,  section: "Parties" },
      { id: "vendeur_adresse",label: "Adresse vendeur",          type: "textarea",placeholder: "12 rue des Lilas, 75001 Paris", required: false, section: "Parties" },
      { id: "acheteur_nom",   label: "Acheteur — Nom complet",   type: "text",   placeholder: "Jean Martin",          required: true,  section: "Parties" },
      { id: "acheteur_adresse",label:"Adresse acheteur",         type: "textarea",placeholder: "5 av. Victor Hugo, 69000 Lyon", required: false, section: "Parties" },
      { id: "article",        label: "Article cédé",             type: "text",   placeholder: "Veste en cuir noire taille S", required: true, section: "Article" },
      { id: "description",    label: "Description & état",       type: "textarea",placeholder: "Détailler l'état, les défauts éventuels...", required: false, section: "Article" },
      { id: "prix_vente",     label: "Prix de cession (€)",      type: "number", placeholder: "35.00",                required: true,  section: "Transaction" },
      { id: "date_vente",     label: "Date de la vente",         type: "date",   placeholder: "",                     required: true,  section: "Transaction" },
      { id: "mode_paiement",  label: "Mode de paiement",         type: "select", options: ["Virement","Paypal","Espèces","CB","Lydia","Autre"], required: false, section: "Transaction" },
      { id: "garanties",      label: "Garanties / clauses",      type: "textarea",placeholder: "Vendu en l'état, sans recours possible...", required: false, section: "Conditions" },
    ]
  },
];

// ─── Génère le PDF en pur HTML/CSS puis imprime via window.print ───
function generateAndDownloadPDF(template, values) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR");
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  let htmlContent = "";

  if (template.id === "facture") {
    const prixHT = parseFloat(values.prix_ht) || 0;
    htmlContent = `
      <div class="doc">
        <div class="header">
          <div class="logo-area">
            <div class="logo">⚡ ListAI Pro</div>
            <div class="doc-type">FACTURE</div>
          </div>
          <div class="doc-meta">
            <div class="meta-row"><span>N°</span><strong>${values.facture_num || "—"}</strong></div>
            <div class="meta-row"><span>Date</span><strong>${values.date_facture || dateStr}</strong></div>
            <div class="meta-row"><span>Via</span><strong>${values.plateforme || "—"}</strong></div>
          </div>
        </div>
        <div class="parties">
          <div class="party">
            <div class="party-title">VENDEUR</div>
            <div class="party-name">${values.vendeur_nom || "—"}</div>
            ${values.vendeur_email ? `<div class="party-detail">${values.vendeur_email}</div>` : ""}
            ${values.vendeur_tel ? `<div class="party-detail">${values.vendeur_tel}</div>` : ""}
          </div>
          <div class="party-arrow">→</div>
          <div class="party">
            <div class="party-title">ACHETEUR</div>
            <div class="party-name">${values.acheteur_nom || "—"}</div>
            ${values.acheteur_email ? `<div class="party-detail">${values.acheteur_email}</div>` : ""}
          </div>
        </div>
        <table class="items-table">
          <thead><tr><th>Article</th><th>Description</th><th>Montant</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>${values.article_nom || "—"}</strong></td>
              <td>${values.article_desc || ""}</td>
              <td class="price">${prixHT.toFixed(2)} €</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2"><strong>TOTAL TTC</strong></td>
              <td class="price total">${prixHT.toFixed(2)} €</td>
            </tr>
          </tfoot>
        </table>
        <div class="payment-row">
          <span>Mode de paiement :</span>
          <strong>${values.mode_paiement || "—"}</strong>
        </div>
        ${values.notes ? `<div class="notes"><strong>Notes :</strong> ${values.notes}</div>` : ""}
        <div class="footer">Document généré par ListAI Pro · ${dateStr} ${timeStr}</div>
      </div>`;
  }

  else if (template.id === "fiche_article") {
    const prix = parseFloat(values.prix) || 0;
    const prixAchat = parseFloat(values.prix_achat) || 0;
    const marge = prixAchat > 0 ? (prix - prixAchat).toFixed(2) : null;
    htmlContent = `
      <div class="doc">
        <div class="header orange">
          <div class="logo-area">
            <div class="logo">⚡ ListAI Pro</div>
            <div class="doc-type">FICHE ARTICLE</div>
          </div>
          <div class="big-price">${prix.toFixed(2)} €</div>
        </div>
        <div class="article-title">${values.titre || "—"}</div>
        <div class="pills-grid">
          ${values.marque ? `<div class="pill"><span>Marque</span><strong>${values.marque}</strong></div>` : ""}
          ${values.taille ? `<div class="pill"><span>Taille</span><strong>${values.taille}</strong></div>` : ""}
          ${values.couleur ? `<div class="pill"><span>Couleur</span><strong>${values.couleur}</strong></div>` : ""}
          ${values.matiere ? `<div class="pill"><span>Matière</span><strong>${values.matiere}</strong></div>` : ""}
          ${values.etat ? `<div class="pill"><span>État</span><strong>${values.etat}</strong></div>` : ""}
          ${values.plateforme ? `<div class="pill"><span>Plateforme</span><strong>${values.plateforme}</strong></div>` : ""}
        </div>
        ${values.description ? `<div class="section-block"><div class="section-label">Description</div><div class="section-content">${values.description}</div></div>` : ""}
        ${values.hashtags ? `<div class="section-block"><div class="section-label">Hashtags</div><div class="hashtags">${values.hashtags}</div></div>` : ""}
        <div class="price-recap">
          <div class="price-item"><span>Prix de vente</span><strong>${prix.toFixed(2)} €</strong></div>
          ${prixAchat > 0 ? `<div class="price-item"><span>Prix d'achat</span><strong>${prixAchat.toFixed(2)} €</strong></div>` : ""}
          ${marge !== null ? `<div class="price-item marge"><span>Marge estimée</span><strong class="${parseFloat(marge)>=0?"green":"red"}">${marge} €</strong></div>` : ""}
        </div>
        ${values.ref_interne ? `<div class="ref">Réf. interne : <strong>${values.ref_interne}</strong></div>` : ""}
        <div class="footer">Document généré par ListAI Pro · ${dateStr} ${timeStr}</div>
      </div>`;
  }

  else if (template.id === "etiquette") {
    htmlContent = `
      <div class="doc etiquette-doc">
        <div class="header green">
          <div class="logo">⚡ ListAI Pro</div>
          <div class="doc-type">ÉTIQUETTE COLIS</div>
        </div>
        <div class="etiquette-grid">
          <div class="etiquette-box from">
            <div class="etiquette-label">EXPÉDITEUR</div>
            <div class="etiquette-name">${values.expediteur_nom || "—"}</div>
            <div class="etiquette-addr">${(values.expediteur_adresse || "").replace(/\n/g,"<br>")}</div>
            ${values.expediteur_tel ? `<div class="etiquette-tel">📞 ${values.expediteur_tel}</div>` : ""}
          </div>
          <div class="etiquette-arrow">▼</div>
          <div class="etiquette-box to">
            <div class="etiquette-label">DESTINATAIRE</div>
            <div class="etiquette-name">${values.dest_nom || "—"}</div>
            <div class="etiquette-addr">${(values.dest_adresse || "").replace(/\n/g,"<br>")}</div>
            ${values.dest_tel ? `<div class="etiquette-tel">📞 ${values.dest_tel}</div>` : ""}
          </div>
        </div>
        <div class="transport-bar">
          <div class="transport-item"><span>Transporteur</span><strong>${values.transporteur || "—"}</strong></div>
          ${values.poids ? `<div class="transport-item"><span>Poids</span><strong>${values.poids} kg</strong></div>` : ""}
          ${values.ref_colis ? `<div class="transport-item"><span>Référence</span><strong>${values.ref_colis}</strong></div>` : ""}
          ${values.contenu ? `<div class="transport-item"><span>Contenu</span><strong>${values.contenu}</strong></div>` : ""}
        </div>
        ${values.notes_exp ? `<div class="notes"><strong>⚠️ Instructions :</strong> ${values.notes_exp}</div>` : ""}
        <div class="footer">ListAI Pro · ${dateStr} ${timeStr}</div>
      </div>`;
  }

  else if (template.id === "contrat") {
    const prix = parseFloat(values.prix_vente) || 0;
    htmlContent = `
      <div class="doc">
        <div class="header blue">
          <div class="logo">⚡ ListAI Pro</div>
          <div class="doc-type">ACCORD DE VENTE</div>
        </div>
        <div class="contrat-intro">
          Les soussignés ont convenu de la cession suivante :
        </div>
        <div class="parties">
          <div class="party">
            <div class="party-title">VENDEUR</div>
            <div class="party-name">${values.vendeur_nom || "—"}</div>
            ${values.vendeur_adresse ? `<div class="party-detail">${values.vendeur_adresse.replace(/\n/g,"<br>")}</div>` : ""}
          </div>
          <div class="party-arrow">↔</div>
          <div class="party">
            <div class="party-title">ACHETEUR</div>
            <div class="party-name">${values.acheteur_nom || "—"}</div>
            ${values.acheteur_adresse ? `<div class="party-detail">${values.acheteur_adresse.replace(/\n/g,"<br>")}</div>` : ""}
          </div>
        </div>
        <div class="section-block">
          <div class="section-label">Article cédé</div>
          <div class="article-title" style="font-size:16px">${values.article || "—"}</div>
          ${values.description ? `<div class="section-content" style="margin-top:6px">${values.description}</div>` : ""}
        </div>
        <div class="transaction-box">
          <div class="trans-row"><span>Prix de cession</span><strong class="big-price-inline">${prix.toFixed(2)} €</strong></div>
          <div class="trans-row"><span>Date</span><strong>${values.date_vente || "—"}</strong></div>
          <div class="trans-row"><span>Mode de paiement</span><strong>${values.mode_paiement || "—"}</strong></div>
        </div>
        ${values.garanties ? `<div class="section-block"><div class="section-label">Conditions & garanties</div><div class="section-content">${values.garanties}</div></div>` : ""}
        <div class="signatures">
          <div class="sig-box"><div class="sig-label">Signature vendeur</div><div class="sig-line"/><div class="sig-name">${values.vendeur_nom || ""}</div></div>
          <div class="sig-box"><div class="sig-label">Signature acheteur</div><div class="sig-line"/><div class="sig-name">${values.acheteur_nom || ""}</div></div>
        </div>
        <div class="footer">Document généré par ListAI Pro · ${dateStr} ${timeStr} · Non contractuel sans signatures originales</div>
      </div>`;
  }

  const fullHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${template.label} — ListAI Pro</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f7; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 24px; }
  .doc { background: white; border-radius: 16px; padding: 32px; max-width: 680px; width: 100%; box-shadow: 0 4px 32px rgba(0,0,0,0.08); }

  /* HEADER */
  .header { border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg,#7C3AED,#2563EB); color: white; }
  .header.orange { background: linear-gradient(135deg,#FF6B2B,#FF9500); }
  .header.green { background: linear-gradient(135deg,#059669,#10B981); }
  .header.blue { background: linear-gradient(135deg,#2563EB,#06B6D4); }
  .logo { font-size: 13px; font-weight: 800; color: rgba(255,255,255,0.8); margin-bottom: 4px; }
  .doc-type { font-size: 22px; font-weight: 900; color: white; letter-spacing: -0.3px; }
  .big-price { font-size: 32px; font-weight: 900; color: white; }
  .doc-meta { text-align: right; display: flex; flex-direction: column; gap: 4px; }
  .meta-row { display: flex; gap: 8px; justify-content: flex-end; font-size: 12px; color: rgba(255,255,255,0.8); }
  .meta-row strong { color: white; }

  /* PARTIES */
  .parties { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .party { flex: 1; background: #f5f5f7; border-radius: 10px; padding: 14px; }
  .party-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #8e8e93; margin-bottom: 6px; }
  .party-name { font-size: 15px; font-weight: 700; color: #1d1d1f; margin-bottom: 3px; }
  .party-detail { font-size: 12px; color: #6e6e73; }
  .party-arrow { font-size: 20px; color: #8e8e93; flex-shrink: 0; }

  /* TABLE */
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .items-table th { background: #f5f5f7; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #8e8e93; }
  .items-table td { padding: 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #1d1d1f; vertical-align: top; }
  .items-table .price { text-align: right; font-weight: 700; font-size: 14px; white-space: nowrap; }
  .total-row { background: #f5f5f7; }
  .total-row td { font-size: 14px; padding: 14px 12px; }
  .total-row .total { font-size: 18px; color: #7C3AED; }
  .payment-row { background: #f5f5f7; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #6e6e73; display: flex; gap: 8px; align-items: center; margin-bottom: 16px; }
  .payment-row strong { color: #1d1d1f; }

  /* ARTICLE FICHE */
  .article-title { font-size: 20px; font-weight: 900; color: #1d1d1f; margin-bottom: 16px; letter-spacing: -0.3px; }
  .pills-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .pill { background: #f5f5f7; border-radius: 8px; padding: 8px 10px; }
  .pill span { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #8e8e93; margin-bottom: 3px; }
  .pill strong { font-size: 13px; color: #1d1d1f; }
  .price-recap { background: #f5f5f7; border-radius: 10px; padding: 14px; margin: 16px 0; display: flex; flex-direction: column; gap: 6px; }
  .price-item { display: flex; justify-content: space-between; font-size: 13px; color: #6e6e73; }
  .price-item strong { color: #1d1d1f; }
  .price-item.marge { border-top: 1px solid #e5e5ea; padding-top: 8px; margin-top: 4px; font-weight: 700; }
  .green { color: #34c759 !important; }
  .red { color: #ff3b30 !important; }
  .hashtags { font-size: 12px; color: #7C3AED; font-weight: 600; line-height: 1.8; }
  .ref { font-size: 11px; color: #8e8e93; margin-top: 8px; }

  /* SECTION BLOCK */
  .section-block { margin-bottom: 16px; }
  .section-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #8e8e93; margin-bottom: 6px; }
  .section-content { font-size: 13px; color: #1d1d1f; line-height: 1.7; background: #f5f5f7; border-radius: 8px; padding: 12px; }

  /* ÉTIQUETTE */
  .etiquette-doc .etiquette-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .etiquette-box { border-radius: 10px; padding: 16px; }
  .etiquette-box.from { background: #f5f5f7; border: 2px dashed #d1d1d6; }
  .etiquette-box.to { background: #f0f5ff; border: 2px solid #2563EB; }
  .etiquette-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; color: #8e8e93; margin-bottom: 6px; }
  .etiquette-name { font-size: 18px; font-weight: 900; color: #1d1d1f; margin-bottom: 4px; }
  .etiquette-addr { font-size: 13px; color: #3a3a3c; line-height: 1.6; }
  .etiquette-tel { font-size: 12px; color: #6e6e73; margin-top: 4px; }
  .etiquette-arrow { text-align: center; font-size: 20px; color: #8e8e93; }
  .transport-bar { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; background: #1d1d1f; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
  .transport-item { display: flex; flex-direction: column; gap: 2px; }
  .transport-item span { font-size: 9px; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700; }
  .transport-item strong { font-size: 14px; color: white; font-weight: 800; }

  /* CONTRAT */
  .contrat-intro { font-size: 13px; color: #6e6e73; margin-bottom: 20px; font-style: italic; }
  .transaction-box { background: #f0f5ff; border-radius: 10px; padding: 16px; margin: 16px 0; border: 1px solid #bfdbfe; }
  .trans-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #6e6e73; margin-bottom: 8px; }
  .trans-row:last-child { margin-bottom: 0; }
  .trans-row strong { color: #1d1d1f; font-size: 14px; }
  .big-price-inline { font-size: 20px; font-weight: 900; color: #2563EB; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 28px 0 16px; }
  .sig-box { display: flex; flex-direction: column; gap: 8px; }
  .sig-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #8e8e93; letter-spacing: 0.6px; }
  .sig-line { height: 1px; background: #1d1d1f; margin-top: 40px; }
  .sig-name { font-size: 11px; color: #6e6e73; }

  /* COMMUN */
  .notes { background: #fff9f0; border-left: 3px solid #ff9500; padding: 12px; border-radius: 0 8px 8px 0; font-size: 12px; color: #3a3a3c; margin-bottom: 16px; line-height: 1.6; }
  .footer { text-align: center; font-size: 10px; color: #aeaeb2; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

  @media print {
    body { padding: 0; background: white; }
    .doc { box-shadow: none; border-radius: 0; }
  }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;

  // Ouvre dans une nouvelle fenêtre et lance l'impression/save
  const win = window.open("", "_blank");
  if (!win) {
    alert("Autorise les pop-ups pour générer le PDF !");
    return;
  }
  win.document.write(fullHTML);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 600);
}

// ─── Composant principal ───
export function TabPDF({ dark }) {
  const GOLD = "#7C3AED";
  const GRAD = "linear-gradient(135deg,#7C3AED,#2563EB)";
  const GRAD_O = "linear-gradient(135deg,#FF6B2B,#FF9500)";
  const T = {
    bg: (d) => d ? "#000000" : "#f5f5f7",
    card: (d) => d ? "#1c1c1e" : "#ffffff",
    card2: (d) => d ? "#2c2c2e" : "#f2f2f7",
    border: (d) => d ? "#3a3a3c" : "#e5e5ea",
    text: (d) => d ? "#f5f5f7" : "#1d1d1f",
    text2: (d) => d ? "#aeaeb2" : "#6e6e73",
    text3: (d) => d ? "#636366" : "#aeaeb2",
  };

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [values, setValues] = useState({});
  const [toast, setToast] = useState(null);
  const [preview, setPreview] = useState(false);

  const set = (id, val) => setValues(prev => ({ ...prev, [id]: val }));

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    const required = selectedTemplate.fields.filter(f => f.required);
    const missing = required.filter(f => !values[f.id]?.trim?.() && !values[f.id]);
    if (missing.length > 0) {
      setToast(`⚠️ Champ requis : "${missing[0].label}"`);
      setTimeout(() => setToast(null), 3000);
      return;
    }
    generateAndDownloadPDF(selectedTemplate, values);
    setToast("✓ PDF généré ! Sauvegarde ou imprime depuis la fenêtre ouverte.");
    setTimeout(() => setToast(null), 4000);
  };

  const reset = () => {
    setSelectedTemplate(null);
    setValues({});
    setPreview(false);
  };

  // Groupe les champs par section
  const groupedFields = selectedTemplate
    ? selectedTemplate.fields.reduce((acc, f) => {
        if (!acc[f.section]) acc[f.section] = [];
        acc[f.section].push(f);
        return acc;
      }, {})
    : {};

  return (
    <div>
      {/* Titre */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text(dark), margin: "0 0 4px", letterSpacing: "-0.3px" }}>
          📄 Modificateur PDF
        </h2>
        <p style={{ color: T.text2(dark), fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          Génère des documents professionnels personnalisés
        </p>
      </div>

      {/* Sélection du template */}
      {!selectedTemplate && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text2(dark), textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12 }}>
            Choisir un type de document
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {PDF_TEMPLATES.map(t => (
              <div
                key={t.id}
                onClick={() => { setSelectedTemplate(t); setValues({}); }}
                style={{
                  background: t.grad,
                  borderRadius: 16,
                  padding: "20px 16px",
                  cursor: "pointer",
                  boxShadow: `0 8px 24px ${t.color}44`,
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform 0.15s",
                }}
              >
                <div style={{ position: "absolute", top: -15, right: -15, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
                <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "white", marginBottom: 4, lineHeight: 1.3 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{t.desc}</div>
              </div>
            ))}
          </div>

          {/* Info */}
          <div style={{ background: T.card(dark), border: `1px solid ${T.border(dark)}`, borderLeft: `3px solid ${GOLD}`, borderRadius: 12, padding: 14, marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text2(dark), textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>💡 Comment ça marche</div>
            {["Choisis le type de document", "Remplis les champs (2 min)", "Clique Générer → PDF professionnel", "Sauvegarde ou imprime directement"].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 3 ? 6 : 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: GRAD, color: "#1a1a2e", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: 12, color: T.text2(dark), lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire */}
      {selectedTemplate && (
        <div>
          {/* Header template sélectionné */}
          <div style={{ background: selectedTemplate.grad, borderRadius: 16, padding: "16px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{selectedTemplate.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: "white" }}>{selectedTemplate.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{selectedTemplate.desc}</div>
              </div>
            </div>
            <button
              onClick={reset}
              style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid rgba(255,255,255,0.4)", background: "transparent", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              ← Changer
            </button>
          </div>

          {/* Champs groupés par section */}
          {Object.entries(groupedFields).map(([section, fields]) => (
            <div
              key={section}
              style={{ background: T.card(dark), border: `1px solid ${T.border(dark)}`, borderRadius: 16, padding: 16, marginBottom: 12 }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: selectedTemplate.color, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12 }}>
                {section}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {fields.map(f => (
                  <div key={f.id}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.text2(dark), marginBottom: 5, display: "flex", gap: 4, alignItems: "center" }}>
                      {f.label}
                      {f.required && <span style={{ color: "#ff3b30", fontSize: 10 }}>*</span>}
                    </div>

                    {f.type === "textarea" ? (
                      <textarea
                        value={values[f.id] || ""}
                        onChange={e => set(f.id, e.target.value)}
                        placeholder={f.placeholder}
                        rows={3}
                        style={{
                          width: "100%", padding: "10px 12px", border: `1.5px solid ${values[f.id] ? selectedTemplate.color + "60" : T.border(dark)}`,
                          borderRadius: 10, fontSize: 13, background: T.card2(dark), color: T.text(dark),
                          outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6,
                          transition: "border-color 0.15s"
                        }}
                      />
                    ) : f.type === "select" ? (
                      <select
                        value={values[f.id] || ""}
                        onChange={e => set(f.id, e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", border: `1.5px solid ${values[f.id] ? selectedTemplate.color + "60" : T.border(dark)}`,
                          borderRadius: 10, fontSize: 13, background: T.card2(dark), color: values[f.id] ? T.text(dark) : T.text3(dark),
                          outline: "none", boxSizing: "border-box", cursor: "pointer", transition: "border-color 0.15s"
                        }}
                      >
                        <option value="">— Choisir —</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={f.type}
                        value={values[f.id] || ""}
                        onChange={e => set(f.id, e.target.value)}
                        placeholder={f.placeholder}
                        style={{
                          width: "100%", padding: "10px 12px", border: `1.5px solid ${values[f.id] ? selectedTemplate.color + "60" : T.border(dark)}`,
                          borderRadius: 10, fontSize: 13, background: T.card2(dark), color: T.text(dark),
                          outline: "none", boxSizing: "border-box", transition: "border-color 0.15s"
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Barre de complétion */}
          {(() => {
            const total = selectedTemplate.fields.filter(f => f.required).length;
            const filled = selectedTemplate.fields.filter(f => f.required && (values[f.id]?.toString().trim())).length;
            const pct = total > 0 ? Math.round((filled / total) * 100) : 100;
            return (
              <div style={{ background: T.card(dark), border: `1px solid ${T.border(dark)}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: T.text2(dark), fontWeight: 600 }}>Champs obligatoires</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: pct === 100 ? "#34c759" : GOLD }}>{filled}/{total} remplis</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: T.card2(dark), overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#34c759" : GRAD, borderRadius: 3, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })()}

          {/* Bouton générer */}
          <button
            onClick={handleGenerate}
            style={{
              width: "100%", padding: "15px 20px", borderRadius: 14, border: "none",
              background: selectedTemplate.grad, color: "white", fontSize: 15, fontWeight: 800,
              cursor: "pointer", boxShadow: `0 6px 20px ${selectedTemplate.color}50`, letterSpacing: "0.1px",
              transition: "all 0.15s"
            }}
          >
            📄 Générer le PDF — {selectedTemplate.label}
          </button>

          <div style={{ textAlign: "center", fontSize: 11, color: T.text3(dark), marginTop: 8, lineHeight: 1.5 }}>
            Une fenêtre s'ouvrira · Appuie sur <strong>Enregistrer en PDF</strong> dans la boîte d'impression
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          background: "#1d1d1f", color: "white", padding: "10px 20px", borderRadius: 50,
          fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", whiteSpace: "nowrap"
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/*
═══════════════════════════════════════════════════════
  INTÉGRATION DANS App.jsx — 3 modifications à faire
═══════════════════════════════════════════════════════

1) Dans la constante TABS (ligne ~15), ajouter :
   {id:"pdf",icon:"📄",label:"PDF"}

2) Dans la constante COMPONENTS (vers ligne 1460), ajouter :
   pdf:<TabPDF dark={dark}/>,

3) Dans HOME_CARDS (vers ligne 1475), ajouter :
   {id:"pdf",icon:"📄",label:"Modifier un PDF",sub:"Factures, fiches, étiquettes",grad:"linear-gradient(135deg,#0EA5E9,#7C3AED)",shadow:"rgba(14,165,233,0.4)"},

4) En haut du fichier App.jsx, importer ce composant :
   import { TabPDF } from "./TabPDF";
   (ou copier-coller directement la fonction TabPDF dans App.jsx)
═══════════════════════════════════════════════════════
*/
