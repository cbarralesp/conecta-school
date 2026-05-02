package com.example.authhexagonal.domain.exception;

public class AiSuggestionUnavailableException extends RuntimeException {

    private final String reasonCode;

    public AiSuggestionUnavailableException(String reasonCode, String message) {
        super(message);
        this.reasonCode = reasonCode;
    }

    public String reasonCode() {
        return reasonCode;
    }
}
