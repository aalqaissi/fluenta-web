import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../mock/data.dart';

class AppState extends ChangeNotifier {
  FluentaUser _user = currentUser;
  bool _previewFree = false;

  FluentaUser get user => _user;
  bool get previewFree => _previewFree;

  PlanTier get effectivePlan => _previewFree ? PlanTier.free : _user.plan;
  bool get isPro => effectivePlan == PlanTier.pro;

  /// listening / speaking / full-exam are locked on the free tier.
  bool isLocked(String key) {
    if (effectivePlan == PlanTier.pro) return false;
    return key == 'listening' || key == 'speaking' || key == 'full-exam';
  }

  void setPreviewFree(bool v) {
    _previewFree = v;
    notifyListeners();
  }

  void setExamDate(DateTime date, double targetBand) {
    _user = _user.copyWith(examDate: date, targetBand: targetBand);
    notifyListeners();
  }

  void clearExamDate() {
    _user = _user.copyWith(clearExamDate: true);
    notifyListeners();
  }

  void setSaveHistory(bool v) {
    _user = _user.copyWith(saveHistory: v);
    notifyListeners();
  }
}
