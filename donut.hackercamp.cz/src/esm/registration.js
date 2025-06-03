import { getSlackProfile } from "./lib/profile.js";
import * as rollbar from "./lib/rollbar.js";

export async function optout() {
  if (!confirm("Opravdu se letos nezúčastníš? Tohle nejde vzít zpět.")) {
    return;
  }
  try {
    const { email } = getSlackProfile();
    await fetch("https://api.hackercamp.cz/v1/optout", {
      method: "POST",
      body: new URLSearchParams({ email, year: document.forms.reg.year.value }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    if (confirm("Ohlášeno. Díky za ochotu.")) {
      location.assign("https://donut.hackercamp.cz/");
    }
  } catch (err) {
    rollbar.error(err);
    alert("Se nepovedlo, zkusim prosím jiny.");
  }
}

function showSection(selectors) {
  for (const section of document.querySelectorAll(selectors)) {
    section.hidden = false;
    if (section.tagName === "FIELDSET") {
      section.disabled = false;
    }
    for (const fieldset of section.querySelectorAll("fieldset")) {
      fieldset.hidden = false;
      fieldset.disabled = false;
    }
  }
}

function hideSection(selectors) {
  for (const section of document.querySelectorAll(selectors)) {
    section.hidden = true;
    if (section.tagName === "FIELDSET") {
      section.disabled = true;
    }
    for (const fieldset of section.querySelectorAll("fieldset")) {
      fieldset.hidden = true;
      fieldset.disabled = true;
    }
  }
}

function disableForm(form) {
  form.disabled = true;
  for (const field of form.querySelectorAll("input, textarea, select, button")) {
    field.disabled = true;
  }
}

export async function main({ env, formElement, submitButtonElement, searchParams }) {
  rollbar.init(env);
  const dbgContext = {};
  try {
    const { year } = env;
    const { email, sub: slackID, picture: image, real_name  } = getSlackProfile();
    rollbar.configure({
      payload: { person: { name: real_name, email, id: slackID } }
    });
    formElement.image.value = image;
    formElement.slackID.value = slackID;

    const response = await fetch(
      `${env["api-host"]}registration?${new URLSearchParams({ email, year, slackID })}`,
      { headers: { Accept: "application/json" } }
    );
    const data = await response.json();

    if (data.invoiced || data.paid) disableForm(formElement);

    if (data.plusFirstName || data.plusLastName) {
      document.getElementById("plus-one-section").hidden = false;
    }

    for (const key in data) {
      const field = formElement[key];
      let value = data[key];
      Object.assign(dbgContext, { key, value });
      if (!(field && value)) continue;
      const isRadio = field.length && field[0].type === "radio";
      const isCheckbox = field.type === "checkbox";
      dbgContext.isRadio = isRadio;
      dbgContext.isCheckbox = isCheckbox;
      Object.assign({ isRadio, isCheckbox });
      if (isCheckbox) {
        field.checked = value;
      } else if (isRadio) {
        formElement.querySelector(`[value="${value}"]`).checked = true;
      } else if (field.type === "select-one") {
        if (value === true) value = "1";
        field.querySelector(`[value="${value}"]`).selected = true;
        field.dispatchEvent(new Event("change"));
      } else if (field.length) {
        const option = Array.from(field).find(option => option.value === value);
        if (option) {
          option.selected = true;
        } else {
          field.value = value;
        }
      } else {
        field.value = value;
      }
    }
  } catch (err) {
    rollbar.configure({ payload: { client: { dbgContext } } });
    rollbar.error(err);
    alert("Něco se kouslo, zkuste to jindy.");
  }

  formElement.addEventListener("submit", e => {
    e.preventDefault();
    submitButtonElement.disabled = true;

    fetch(e.target.action, {
      method: "POST",
      body: new URLSearchParams(new FormData(e.target)),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })
    .then(response => {
      if (!response.ok) {
        throw response;
      }
      return response.json();
    })
    .then(data => {
      location.href = `/registrace/potvrzeno/?${searchParams}`;
    })
    .catch(err => {
      rollbar.error(err);
      alert("Se to někde zaseklo, zkuste to prosím znovu");
    })
    .finally(() => {
      submitButtonElement.disabled = false;
    });
  });

  hideSection("#someone-else-will-pay");
  document.getElementById("email").addEventListener("blur", e => {
    document.getElementById("invoice-email").placeholder = e.target.value;
  });
  document.getElementById("invoice-recipient").addEventListener("change", e => {
    if (e.target.value == 0) {
      showSection("#I-will-pay");
      hideSection("#someone-else-will-pay");
    } else if (e.target.value == 1) {
      hideSection("#I-will-pay");
      showSection("#someone-else-will-pay");
    }
  });

  const stayTime = document.getElementById("stay-time");
  const customStayTime = document.getElementById("custom-stay-time");
  stayTime.addEventListener("change", e => {
    if (e.target.value == 2) {
      customStayTime.parentElement.hidden = false;
    } else {
      customStayTime.parentElement.hidden = true;
    }
  });

  const shirt = document.getElementById("shirt");
  const shirtSize = document.getElementById("shirt-size");
  shirt.addEventListener("change", e => {
    shirtSize.disabled = !e.target.checked;
  });

  const isVolunteer = searchParams.has("volunteer");

  if (isVolunteer) {
    hideSection(".hacker");
    showSection(".volunteer");
    document.querySelector("#contact h2").innerText = "Dobrovolník";
  }
}
