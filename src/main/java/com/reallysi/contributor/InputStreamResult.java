package com.reallysi.contributor;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;

import com.reallysi.rsuite.api.remoteapi.RemoteApiResult;
import com.reallysi.rsuite.api.remoteapi.ResponseStatus;

public class InputStreamResult implements RemoteApiResult {
	private String contentType = "application/octet-stream";
	public InputStreamResult(InputStream fileInputStream) {
		super();
		setInputStream(fileInputStream);
	}
	public InputStreamResult(InputStream fileInputStream, String contentType) {
		this(fileInputStream);
		setContentType(contentType);
	}
	@Override public String getContentType() { return contentType; }
	public void setContentType(String contentType) { this.contentType = contentType; }
	
	private String encoding = null;
	@Override public String getEncoding() { return encoding; }
	public void setEncoding(String encoding) { this.encoding = encoding; }
	
	private InputStream inputStream = null;
	
	
	@Override public InputStream getInputStream() throws IOException { return inputStream; }
	public void setInputStream(InputStream inputStream) {
		this.inputStream = inputStream;
		if (this.reader != null) { this.reader = null; }
	}
	private Reader reader = null;
	@Override public Reader getReader() {
		if (reader != null) { return reader; }
		if (inputStream != null) {
			reader = new InputStreamReader(inputStream);
			return reader;
		}
		return null;
	}

	private String label = null;
	@Override public String getLabel() { return label; }
	public void setLabel(String label) { this.label = label; }
	

	private ResponseStatus responseStatus = ResponseStatus.SUCCESS;
	@Override public ResponseStatus getResponseStatus() { return responseStatus; }
	@Override public void setResponseStatus(ResponseStatus status) { this.responseStatus = status; }
	
	private String suggestedFileName = null;
	@Override public String getSuggestedFileName() { return suggestedFileName; }
	public void setSuggestedFileName(String suggestedFileName) { this.suggestedFileName = suggestedFileName; }
}
