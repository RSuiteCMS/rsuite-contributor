package com.reallysi.contributor.config;

import java.util.Map;

import javax.xml.bind.ValidationException;

import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

abstract public class ConfigMarshaller {
	public static ContributorConfig fromContributorDocument(Document doc) throws ValidationException {
		NodeList nl = doc.getChildNodes();
		for (int i = 0; i < nl.getLength(); i += 1) {
			Node node = nl.item(i);
			if (node.getNodeType() != Node.ELEMENT_NODE) {
				continue;
			}
			String name = node.getNodeName().toLowerCase();
			if ("contributor".equals(name)) {
				return fromContributorTag((Element) node);
			}
		}
		return null;
	}

	private static ContributorConfig fromContributorTag(Element tag) throws ValidationException {
		ContributorConfig conf = new ContributorConfig();
		NodeList nl = tag.getChildNodes();
		for (int i = 0; i < nl.getLength(); i += 1) {
			Node node = nl.item(i);
			if (node.getNodeType() != Node.ELEMENT_NODE) {
				continue;
			}
			String name = node.getNodeName().toLowerCase();
			if ("workflowresults".equals(name)) {
				if (conf.workflowResults != null) {
					throw new ValidationException("contributor tag may not contain multiple instances of workflowResults tag");
				}
				conf.workflowResults = fromWorkflowResultsTag((Element) node);
			} else if ("attachments".equals(name)) {
				if (conf.attachments != null) {
					throw new ValidationException("contributor tag may not contain multiple instances of attachments tag");
				}
				conf.attachments = fromAttachmentsTag((Element) node);
			}
		}
		return conf;
	}
	
	private static WorkflowResultsConfig fromWorkflowResultsTag(Element tag) {
		WorkflowResultsConfig results = new WorkflowResultsConfig();
		NodeList nl = tag.getChildNodes();
		for (int i = 0; i < nl.getLength(); i += 1) {
			Node node = nl.item(i);
			if (node.getNodeType() != Node.ELEMENT_NODE) {
				continue;
			}
			String name = node.getNodeName().toLowerCase();
			if ("column".equals(name)) {
				results.columns.add(fromColumnTag((Element) node));
			}
		}
		return results;
	}
	private static Column fromColumnTag(Element tag) {
		Column column = new Column();
		NamedNodeMap nl = tag.getAttributes();
		for (int i = 0; i < nl.getLength(); i += 1) {
			Attr attr = (Attr) nl.item(i);
			String name = attr.getNodeName().toLowerCase();
			if ("label".equals(name)) {
				column.label = attr.getNodeValue();
			} else if ("name".equals(name)) {
				column.name = attr.getNodeValue();
			} else {
				// Maybe in future...
				//column.properties.put(attr.getNodeName(), attr.getNodeValue());
			}
		}
		return column;
	}

	private static AttachmentsConfig fromAttachmentsTag(Element tag) {
		AttachmentsConfig attachments = new AttachmentsConfig();
		NodeList nl = tag.getChildNodes();
		for (int i = 0; i < nl.getLength(); i += 1) {
			Node node = nl.item(i);
			if (node.getNodeType() != Node.ELEMENT_NODE) {
				continue;
			}
			String name = node.getNodeName().toLowerCase();
			if ("column".equals(name)) {
				attachments.columns.add(fromColumnTag((Element) node));
			}
			if ("button".equals(name)) {
				attachments.buttons.add(fromButtonTag((Element) node));
			}
		}
		return attachments;
	}

	private static ActionButton fromButtonTag(Element tag) {
		ActionButton button = new ActionButton();
		NodeList nl = tag.getChildNodes();
		for (int i = 0; i < nl.getLength(); i += 1) {
			Node node = nl.item(i);
			if (node.getNodeType() != Node.ELEMENT_NODE) {
				continue;
			}
			String name = node.getNodeName().toLowerCase();
			if ("action".equals(name)) {
				button.add(fromActionTag((Element) node));
			}
		}
		return button;
	}

	private static ActionConfig fromActionTag(Element tag) {
		ActionConfig action = new ActionConfig();
		NamedNodeMap nl = tag.getAttributes();
		for (int i = 0; i < nl.getLength(); i += 1) {
			Attr attr = (Attr) nl.item(i);
			String name = attr.getNodeName().toLowerCase();
			if ("label".equals(name)) {
				action.label = attr.getNodeValue();
			} else if ("name".equals(name)) {
				action.name = attr.getNodeValue();
			} else if ("rule".equals(name)) {
				action.rule = attr.getNodeValue();
			} else if ("icon".equals(name)) {
				action.icon = attr.getNodeValue();
			} else {
				action.properties.put(attr.getNodeName(), attr.getNodeValue());
			}
		}
		return action;
	}
	public static Element toElement(Document doc, ContributorConfig conf) {
		Element e = doc.createElement("contributor");
		if (conf.workflowResults != null) {
			e.appendChild(toElement(doc, conf.workflowResults));
		}
		if (conf.attachments != null) {
			e.appendChild(toElement(doc, conf.attachments));
		}
		return e;
	}

	private static Node toElement(Document doc, AttachmentsConfig attachments) {
		Element e = doc.createElement("attachments");
		for (Column col : attachments.columns) {
			e.appendChild(toElement(doc, col));
		}
		for (ActionButton btn : attachments.buttons) {
			e.appendChild(toElement(doc, btn));
		}
		return e;
	}

	private static Node toElement(Document doc, ActionButton btn) {
		Element e = doc.createElement("button");
		for (ActionConfig act : btn) {
			e.appendChild(toElement(doc, act));
		}
		return e;
	}

	private static Node toElement(Document doc, ActionConfig act) {
		Element e = doc.createElement("action");
		e.setAttribute("name", act.name);
		e.setAttribute("label", act.label);
		e.setAttribute("icon", act.icon);
		e.setAttribute("rule", act.rule);
		for (Map.Entry<String, String> p : act.properties.entrySet()) {
			e.setAttribute(p.getKey(), p.getValue());
		}
		return e;
	}

	private static Element toElement(Document doc, WorkflowResultsConfig workflowResults) {
		Element e = doc.createElement("workflowResults");
		for (Column col : workflowResults.columns) {
			e.appendChild(toElement(doc, col));
		}
		return e;
	}

	private static Element toElement(Document doc, Column col) {
		Element e = doc.createElement("column");
		e.setAttribute("name", col.name);
		e.setAttribute("label", col.label);
		return e;
	}

}
