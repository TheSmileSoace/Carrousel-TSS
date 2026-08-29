@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Preparation images orthodontie - The Smile Space

REM ============================================================================
REM  LANCEUR DOUBLE-CLIC (Windows)
REM  1) verifie Python + dependances   2) APERCU (n'ecrit rien)
REM  3) demande confirmation           4) traitement reel
REM
REM  A placer DANS LE MEME DOSSIER que "prepa_images_ortho.py".
REM  Astuce : vous pouvez aussi GLISSER un dossier sur ce .bat -> il devient
REM  le dossier d'entree.
REM ============================================================================

REM ======================= REGLAGES (a modifier) ==============================
REM  Dossier d'entree (SELECTION DEJA ANONYMISEE). En mode "lot", c'est le
REM  dossier PARENT qui contient un sous-dossier par patient.
set "INPUT=Z:\MARPE"

REM  Dossier de sortie (doit etre EN DEHORS de l'entree).
set "OUTPUT=Z:\Conference\MARPE_anonymise"

REM  Mode : "lot" (un sous-dossier = un patient, codes P1,P2...) ou "simple".
set "MODE=lot"

REM  Code patient (utilise UNIQUEMENT en mode "simple").
set "CODE=P1"

REM  Options en plus (facultatif), ex :  --radio-contraste fort --montages
set "OPTIONS="
REM ============================================================================

REM --- Si un dossier est glisse sur le .bat, il devient l'entree ---
if not "%~1"=="" set "INPUT=%~1"

set "SCRIPT=%~dp0prepa_images_ortho.py"

if not exist "%SCRIPT%" (
  echo [ERREUR] "prepa_images_ortho.py" introuvable a cote de ce .bat.
  echo          Placez les deux fichiers dans le meme dossier.
  echo(
  pause & exit /b 1
)

REM --- Localiser Python (python ou lanceur py) ---
set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY ( where py >nul 2>nul && set "PY=py" )
if not defined PY (
  echo [ERREUR] Python 3 introuvable. Installez-le depuis https://www.python.org
  echo          en cochant "Add Python to PATH", puis relancez.
  echo(
  pause & exit /b 1
)

REM --- Dependances (installe si manquantes) ---
%PY% -c "import PIL, numpy" 2>nul
if errorlevel 1 (
  echo Installation des dependances Pillow + numpy...
  %PY% -m pip install --quiet pillow numpy
)
%PY% -c "import cv2" 2>nul
if errorlevel 1 (
  echo Installation d'OpenCV ^(contraste radios, anti-reflets, fond^)...
  %PY% -m pip install --quiet opencv-python-headless
)

REM --- Construire l'argument de mode ---
if /I "%MODE%"=="lot" (
  set "MODEARG=--lot"
) else (
  set "MODEARG=--code %CODE%"
)

echo(
echo ============================================================
echo   APERCU  -  aucun fichier ne sera ecrit
echo   Entree : %INPUT%
echo   Sortie : %OUTPUT%
echo   Mode   : %MODE%
echo ============================================================
echo(
%PY% "%SCRIPT%" --input "%INPUT%" --output "%OUTPUT%" %MODEARG% %OPTIONS% --dry-run --confirme-selection-anonymisee
if errorlevel 1 (
  echo(
  echo [ERREUR] L'apercu a echoue. Verifiez les chemins ci-dessus.
  echo(
  pause & exit /b 1
)

echo(
set "GO="
set /p "GO=Lancer le traitement reel ? (O = oui / autre = annuler) : "
if /I not "%GO%"=="O" (
  echo Annule. Rien n'a ete ecrit.
  echo(
  pause & exit /b 0
)

echo(
echo ============================================================
echo   TRAITEMENT EN COURS...
echo ============================================================
%PY% "%SCRIPT%" --input "%INPUT%" --output "%OUTPUT%" %MODEARG% %OPTIONS% --confirme-selection-anonymisee
if errorlevel 1 (
  echo(
  echo [ERREUR] Le traitement a rencontre un probleme ^(voir messages ci-dessus^).
  echo(
  pause & exit /b 1
)

echo(
echo TERMINE. Images anonymisees dans : %OUTPUT%
if /I "%MODE%"=="lot" echo Registre nom-^>code : correspondance_patients.csv ^(dossier courant, a garder en local^).
echo(
pause
endlocal
