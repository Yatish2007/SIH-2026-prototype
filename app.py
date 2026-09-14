from flask import Flask, send_file
from database import init_database, get_student
from certificate_generator import generate_certificate

app = Flask(__name__)

init_database()


@app.route("/")
def home():

    student = get_student(1)

    if student is None:
        return "Student not found", 404

    # Student hasn't completed the course
    if student["completed"] != 1:
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Course</title>
        </head>

        <body style="
            font-family: Arial;
            text-align: center;
            padding: 100px;
        ">

            <h1>Course in Progress</h1>
            <p>Complete the course to unlock your certificate.</p>

        </body>
        </html>
        """

    return f"""
    <!DOCTYPE html>
    <html>

    <head>

        <title>Course Completed</title>

        <style>

            body {{
                margin: 0;
                font-family: Arial, sans-serif;
                background: #f4f7f8;
                text-align: center;
            }}

            .container {{
                margin-top: 120px;
            }}

            .card {{
                background: white;
                width: 520px;
                margin: auto;
                padding: 45px;
                border-radius: 18px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.12);
            }}

            h1 {{
                color: #087b83;
            }}

            .student {{
                font-size: 28px;
                font-weight: bold;
                margin: 20px;
            }}

            .details {{
                font-size: 17px;
                line-height: 1.8;
                margin-bottom: 30px;
            }}

            button {{
                background: #087b83;
                color: white;
                border: none;
                padding: 15px 35px;
                border-radius: 8px;
                font-size: 18px;
                cursor: pointer;
            }}

            button:hover {{
                background: #06666d;
            }}

            #status {{
                margin-top: 25px;
                font-size: 17px;
            }}

            #download {{
                display: none;
                margin-top: 25px;
            }}

            #download a {{
                display: inline-block;
                background: #d99a00;
                color: white;
                padding: 15px 35px;
                border-radius: 8px;
                text-decoration: none;
                font-size: 18px;
            }}

        </style>

    </head>

    <body>

        <div class="container">

            <div class="card">

                <h1>🎉 Course Completed!</h1>

                <div class="student">
                    {student["name"]}
                </div>

                <div class="details">

                    <div>
                        <b>Course:</b>
                        {student["course"]}
                    </div>

                    <div>
                        <b>Final Score:</b>
                        {student["score"]}/100
                    </div>

                    <div>
                        <b>Completion Date:</b>
                        {student["completion_date"]}
                    </div>

                </div>

                <!-- ONLY BUTTON THE STUDENT SEES -->

                <button
                    id="generateButton"
                    onclick="generateCertificate()"
                >
                    Generate Certificate
                </button>

                <!-- GENERATION STATUS -->

                <div id="status"></div>

                <!-- DOWNLOAD BUTTON -->

                <div id="download">

                    <a href="/certificate/1">
                        Download Certificate
                    </a>

                </div>

            </div>

        </div>


        <script>

            async function generateCertificate() {{

                const button =
                    document.getElementById("generateButton");

                const status =
                    document.getElementById("status");

                const download =
                    document.getElementById("download");


                // Hide generate button
                button.style.display = "none";

                // Small status message
                status.innerHTML =
                    "⏳ Preparing your certificate...";


                try {{

                    // Call Python backend
                    const response =
                        await fetch("/generate/1", {{
                            method: "POST"
                        }});


                    if (!response.ok) {{
                        throw new Error("Generation failed");
                    }}


                    // Generation finished
                    status.innerHTML =
                        "🎓 Your certificate is ready!";


                    // Show download button
                    download.style.display = "block";


                }} catch (error) {{

                    status.innerHTML =
                        "❌ Something went wrong. Please try again.";

                    button.style.display = "inline-block";

                }}

            }}

        </script>

    </body>

    </html>
    """


# =========================================================
# GENERATE CERTIFICATE IN BACKGROUND
# =========================================================

@app.route("/generate/<int:student_id>", methods=["POST"])
def generate(student_id):

    student = get_student(student_id)

    if student is None:
        return "Student not found", 404

    if student["completed"] != 1:
        return "Course not completed", 403

    # Generate PDF
    generate_certificate(student)

    return "Certificate generated successfully", 200


# =========================================================
# DOWNLOAD CERTIFICATE
# =========================================================

@app.route("/certificate/<int:student_id>")
def certificate(student_id):

    student = get_student(student_id)

    if student is None:
        return "Student not found", 404

    if student["completed"] != 1:
        return "Course not completed", 403

    pdf_path = generate_certificate(student)

    return send_file(
        pdf_path,
        as_attachment=True,
        download_name=f"{student['certificate_id']}.pdf"
    )


# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )