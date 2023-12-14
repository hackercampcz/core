import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config("postmark");
let token = config.get("server-api-token") ?? "invalid token";

export function setToken(serverApiToken) {
  token = serverApiToken;
}

interface TemplateInputs {
  Name: string;
  Alias?: string;
  HtmlBody: string;
  TextBody: string;
  Subject: string;
  TemplateType?: string;
  LayoutTemplate?: string;
}

interface TemplateOutputs {
  TemplateId: number;
  Name: string;
  Active: boolean;
  Alias: string | null;
  TemplateType: string;
  LayoutTemplate: string | null;
}

const postmarkTemplateProvider: pulumi.dynamic.ResourceProvider<
  TemplateInputs,
  TemplateOutputs
> = {
  async create(inputs) {
    const resp = await fetch("https://api.postmarkapp.com/templates", {
      method: "POST",
      body: JSON.stringify(inputs),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
    });
    const outs = await resp.json();
    if (outs.ErrorCode) console.log({ outs, inputs });
    return { id: outs.TemplateId.toString(), outs };
  },
  async update(id, olds, news) {
    const resp = await fetch(`https://api.postmarkapp.com/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(news),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
    });
    const outs = await resp.json();
    return { outs };
  },
  async delete(id) {
    await fetch(`https://api.postmarkapp.com/templates/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "X-Postmark-Server-Token": token,
      },
    });
  },
};

interface TemplateResourceInputs {
  Name: pulumi.Input<string>;
  Alias?: pulumi.Input<string>;
  HtmlBody: pulumi.Input<string>;
  TextBody: pulumi.Input<string>;
  Subject: pulumi.Input<string>;
  TemplateType?: pulumi.Input<string>;
  LayoutTemplate?: pulumi.Input<string>;
}

export class Template extends pulumi.dynamic.Resource {
  constructor(
    name: string,
    args: TemplateResourceInputs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(postmarkTemplateProvider, name, args, opts);
  }
}
