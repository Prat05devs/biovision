"""Conjunctiva colour -> haemoglobin ridge model. Features are computed exactly as ConjunctivaAnalyzer.swift does."""
import glob, json, math, sys, warnings
import cv2, numpy as np, openpyxl
from PIL import Image, ImageOps
from sklearn.linear_model import RidgeCV
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import RepeatedKFold
from sklearn.metrics import roc_auc_score
warnings.filterwarnings('ignore')
ROOT = 'eda/dataset anemia'
FEATURE_NAMES = ['r_mean', 'g_mean', 'b_mean', 'r_median', 'g_median', 'ei_mean', 'ei_median', 'ei_p75', 'ei_std', 's_mean', 'v_mean', 'red_fraction', 'female']

def features(path, female):
    img = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    w, h = img.size
    img = img.resize((800, max(1, int(h * 800 / w))), Image.BILINEAR)
    rgb = np.asarray(img)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    m = cv2.bitwise_or(cv2.inRange(hsv, (0, 50, 50), (10, 255, 255)), cv2.inRange(hsv, (160, 50, 50), (180, 255, 255)))
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    m = cv2.morphologyEx(cv2.morphologyEx(m, cv2.MORPH_CLOSE, k), cv2.MORPH_OPEN, k) > 0
    if m.sum() < 200: return None
    px = rgb[m].astype(np.float64) + 1
    r, g, b = px[:, 0], px[:, 1], px[:, 2]; s = r + g + b
    ei = np.log(r) - np.log(g); hv = hsv[m].astype(np.float64)
    q = lambda v, p: float(np.percentile(v, p, method='lower'))
    return [np.mean(r / s), np.mean(g / s), np.mean(b / s), q(r / s, 50), q(g / s, 50),
            np.mean(ei), q(ei, 50), q(ei, 75), np.std(ei), np.mean(hv[:, 1]), np.mean(hv[:, 2]),
            float(m.mean()), 1.0 if female else 0.0]

if __name__ == '__main__':
    rows = []
    for country in ['India', 'Italy']:
        for r in openpyxl.load_workbook(f'{ROOT}/{country}/{country}.xlsx').active.iter_rows(min_row=2, values_only=True):
            try: n = int(r[0]); hb = float(str(r[1]).replace(',', '.'))
            except (TypeError, ValueError): continue
            jpg = [p for p in glob.glob(f'{ROOT}/{country}/{n}/*') if p.lower().endswith(('.jpg', '.jpeg'))]
            if not jpg: continue
            female = str(r[2]).strip().upper().startswith('F')
            f = features(jpg[0], female)
            if f: rows.append(dict(country=country, hb=hb, female=female, f=f, path=jpg[0]))
    X = np.array([r['f'] for r in rows]); y = np.array([r['hb'] for r in rows])
    thr = np.array([12.0 if r['female'] else 13.0 for r in rows]); india = np.array([r['country'] == 'India' for r in rows])
    preds = np.zeros((20, len(y)))
    for i, (tr, te) in enumerate(RepeatedKFold(n_splits=5, n_repeats=20, random_state=1).split(X)):
        mdl = make_pipeline(StandardScaler(), RidgeCV(alphas=np.logspace(-2, 3, 30))); mdl.fit(X[tr], y[tr]); preds[i // 5, te] = mdl.predict(X[te])
    p = preds.mean(0)
    report = {}
    for name, sel in [('all', np.ones(len(y), bool)), ('India', india)]:
        yy, pp, tt = y[sel], p[sel], thr[sel]; an = yy < tt
        entry = dict(n=int(sel.sum()), r=float(np.corrcoef(pp, yy)[0, 1]), mae=float(np.mean(np.abs(pp - yy))), auc=float(roc_auc_score(an, tt - pp)))
        for margin in [0.0, 0.5]:
            low = pp < tt - margin
            entry[f'sens@-{margin}'] = float((low & an).sum() / an.sum()); entry[f'spec@-{margin}'] = float((~low & ~an).sum() / (~an).sum())
        report[name] = entry
        print(name, json.dumps({k: round(v, 3) for k, v in entry.items()}))
    final = make_pipeline(StandardScaler(), RidgeCV(alphas=np.logspace(-2, 3, 30))).fit(X, y)
    scaler, ridge = final.named_steps['standardscaler'], final.named_steps['ridgecv']
    model = dict(version='conjunctiva-colour-ridge-v1', features=FEATURE_NAMES, mean=scaler.mean_.tolist(), scale=scaler.scale_.tolist(),
                 coef=ridge.coef_.tolist(), intercept=float(ridge.intercept_), alpha=float(ridge.alpha_),
                 training=dict(dataset='Eyes-Defy-Anemia (Dimauro et al., CC BY-SA 4.0)', patients=len(y), india=int(india.sum())),
                 cross_validation=report)
    json.dump(model, open('work/conjunctiva_ridge_v1.json', 'w'), indent=2)
    json.dump([dict(path=r['path'], f=r['f']) for r in rows[:4]], open('work/parity_features.json', 'w'))
    print('alpha', ridge.alpha_)
