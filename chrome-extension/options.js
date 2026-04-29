document.addEventListener("DOMContentLoaded", () => {
  const geminiKeyInput = document.getElementById("geminiKey");
  const emailServiceIdInput = document.getElementById("emailServiceId");
  const emailTemplateIdInput = document.getElementById("emailTemplateId");
  const emailPublicKeyInput = document.getElementById("emailPublicKey");
  const saveBtn = document.getElementById("saveBtn");
  const statusEl = document.getElementById("status");

  // Load existing settings
  chrome.storage.local.get(
    ["GEMINI_API_KEY", "EMAILJS_SERVICE_ID", "EMAILJS_TEMPLATE_ID", "EMAILJS_PUBLIC_KEY"],
    (result) => {
      if (result.GEMINI_API_KEY) geminiKeyInput.value = result.GEMINI_API_KEY;
      if (result.EMAILJS_SERVICE_ID) emailServiceIdInput.value = result.EMAILJS_SERVICE_ID;
      if (result.EMAILJS_TEMPLATE_ID) emailTemplateIdInput.value = result.EMAILJS_TEMPLATE_ID;
      if (result.EMAILJS_PUBLIC_KEY) emailPublicKeyInput.value = result.EMAILJS_PUBLIC_KEY;
    }
  );

  saveBtn.addEventListener("click", () => {
    chrome.storage.local.set(
      {
        GEMINI_API_KEY: geminiKeyInput.value.trim(),
        EMAILJS_SERVICE_ID: emailServiceIdInput.value.trim(),
        EMAILJS_TEMPLATE_ID: emailTemplateIdInput.value.trim(),
        EMAILJS_PUBLIC_KEY: emailPublicKeyInput.value.trim(),
      },
      () => {
        statusEl.style.display = "block";
        setTimeout(() => {
          statusEl.style.display = "none";
        }, 3000);
      }
    );
  });
});
