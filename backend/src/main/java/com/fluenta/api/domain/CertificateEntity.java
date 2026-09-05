package com.fluenta.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A practice Test Report Form (mirrors the FE {@code CertRecord}). */
@Entity
@Table(name = "certificates")
public class CertificateEntity {

    @Id
    private String id;

    private String userId;
    private String title;
    private String candidate;
    private String type;              // "standard" | "ielts-report"
    private String verificationNumber; // EIELTS-YYYY-NNNNNN
    private String module;   // academic | general
    private String centre;
    private String issuedOn; // YYYY-MM-DD

    // candidate demographics (TRF)
    private String dateOfBirth;
    private String sex;      // male | female | ""
    private String countryOfOrigin;
    private String nationality;
    private String firstLanguage;
    private String schemeCode;

    /** JSON: { listening, reading, writing, speaking } */
    @Column(columnDefinition = "text")
    private String scores;

    private double overall;
    private String cefr;

    @Column(columnDefinition = "text")
    private String comments;

    private String status;   // draft | issued

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCandidate() { return candidate; }
    public void setCandidate(String candidate) { this.candidate = candidate; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getVerificationNumber() { return verificationNumber; }
    public void setVerificationNumber(String verificationNumber) { this.verificationNumber = verificationNumber; }
    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }
    public String getCentre() { return centre; }
    public void setCentre(String centre) { this.centre = centre; }
    public String getIssuedOn() { return issuedOn; }
    public void setIssuedOn(String issuedOn) { this.issuedOn = issuedOn; }
    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public String getCountryOfOrigin() { return countryOfOrigin; }
    public void setCountryOfOrigin(String countryOfOrigin) { this.countryOfOrigin = countryOfOrigin; }
    public String getNationality() { return nationality; }
    public void setNationality(String nationality) { this.nationality = nationality; }
    public String getFirstLanguage() { return firstLanguage; }
    public void setFirstLanguage(String firstLanguage) { this.firstLanguage = firstLanguage; }
    public String getSchemeCode() { return schemeCode; }
    public void setSchemeCode(String schemeCode) { this.schemeCode = schemeCode; }
    public String getScores() { return scores; }
    public void setScores(String scores) { this.scores = scores; }
    public double getOverall() { return overall; }
    public void setOverall(double overall) { this.overall = overall; }
    public String getCefr() { return cefr; }
    public void setCefr(String cefr) { this.cefr = cefr; }
    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
