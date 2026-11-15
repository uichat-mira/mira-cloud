import { defineCatalog } from "@json-render/core";
import { defineRegistry, useBoundProp } from "@json-render/react";
import { schema } from "@json-render/react/schema";
import { z } from "zod";
import Select from "../../components/mira-design/Select";
import { Switch } from "../../components/mira-design/Switch";

const boundString = z.union([z.string(), z.record(z.string(), z.unknown())]);
const boundBoolean = z.union([z.boolean(), z.record(z.string(), z.unknown())]);

export const delegationCatalog = defineCatalog(schema, {
  components: {
    Flow: {
      description: "A quiet vertical group of review controls",
      props: z.object({ label: z.string() }),
    },
    Intro: {
      description: "A short, readable section introduction",
      props: z.object({ title: z.string(), description: z.string() }),
    },
    ChoiceField: {
      description: "A controlled choice bound to a draft field",
      props: z.object({
        label: z.string(),
        value: boundString,
        options: z
          .array(z.object({ value: z.string(), label: z.string() }))
          .min(1)
          .max(8),
      }),
    },
    ToggleField: {
      description: "An accessible on/off choice bound to a draft field",
      props: z.object({
        label: z.string(),
        description: z.string(),
        value: boundBoolean,
      }),
    },
    Note: {
      description: "A small explanation, never an authorization or task status",
      props: z.object({ text: z.string() }),
    },
  },
  actions: {},
});

export const { registry: delegationRegistry } = defineRegistry(delegationCatalog, {
  components: {
    Flow: ({ props, children }) => (
      <div className="delegation-ui-flow" aria-label={props.label}>
        {children}
      </div>
    ),
    Intro: ({ props }) => (
      <div className="delegation-ui-intro">
        <h3>{props.title}</h3>
        <p>{props.description}</p>
      </div>
    ),
    ChoiceField: ({ props, bindings }) => {
      const [value, setValue] = useBoundProp(props.value, bindings?.["value"]);
      return (
        <div className="delegation-ui-field">
          <Select
            label={props.label}
            value={typeof value === "string" ? value : ""}
            options={props.options}
            onChange={setValue}
            compact
          />
        </div>
      );
    },
    ToggleField: ({ props, bindings }) => {
      const [value, setValue] = useBoundProp(props.value, bindings?.["value"]);
      return (
        <div className="delegation-ui-toggle">
          <span className="delegation-ui-toggle-copy">
            <strong>{props.label}</strong>
            <small>{props.description}</small>
          </span>
          <Switch
            checked={value === true}
            onChange={() => setValue(value !== true)}
            ariaLabel={props.label}
          />
        </div>
      );
    },
    Note: ({ props }) => <p className="delegation-ui-note">{props.text}</p>,
  },
});
