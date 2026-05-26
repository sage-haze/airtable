
      let allRecords = [];

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      function normalizeValue(value) {
        if (value === undefined || value === null) return "";

        if (Array.isArray(value)) {
          return value
            .map((item) => normalizeValue(item))
            .filter(Boolean)
            .join(", ");
        }

        if (typeof value === "object") {
          if (value.name) return String(value.name).trim();
          return JSON.stringify(value);
        }

        return String(value).trim();
      }

      function getStudentName(record) {
        return normalizeValue(record.fields["student_full_name"]) || "Unnamed student";
      }

      function formatDate(value) {
        const normalized = normalizeValue(value);
        if (!normalized) return '<span class="empty">Not provided</span>';

        const date = new Date(normalized);
        if (Number.isNaN(date.getTime())) return escapeHtml(normalized);

        return escapeHtml(
          date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        );
      }

      function formatPlainValue(value) {
        const normalized = normalizeValue(value);

        if (!normalized) {
          return '<span class="empty">Not provided</span>';
        }

        return escapeHtml(normalized);
      }

      function formatRichText(value) {
        const normalized = normalizeValue(value);

        if (!normalized) {
          return '<span class="empty">Not provided</span>';
        }

        let html = escapeHtml(normalized);

        // Basic Markdown-style formatting for Airtable long text fields.
        html = html.replace(/^### (.*)$/gm, "<h4>$1</h4>");
        html = html.replace(/^## (.*)$/gm, "<h3>$1</h3>");
        html = html.replace(/^# (.*)$/gm, "<h2>$1</h2>");
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
        html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
        html = html.replace(/_(.*?)_/g, "<em>$1</em>");

        const lines = html.split("\n");
        const output = [];
        let inList = false;

        for (const line of lines) {
          const bulletMatch = line.match(/^\s*[-*•]\s+(.+)$/);
          const numberedMatch = line.match(/^\s*\d+\.\s+(.+)$/);

          if (bulletMatch || numberedMatch) {
            if (!inList) {
              output.push("<ul>");
              inList = true;
            }
            output.push(`<li>${bulletMatch ? bulletMatch[1] : numberedMatch[1]}</li>`);
          } else {
            if (inList) {
              output.push("</ul>");
              inList = false;
            }

            if (line.trim() === "") {
              output.push("");
            } else if (line.startsWith("<h")) {
              output.push(line);
            } else {
              output.push(`<p>${line}</p>`);
            }
          }
        }

        if (inList) output.push("</ul>");

        return output.join("");
      }

      function setupStudentFilter(records) {
        const filter = document.getElementById("studentFilter");

        const studentNames = Array.from(
          new Set(records.map(getStudentName).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

        if (studentNames.length === 0) {
          filter.innerHTML = "<option>No students found</option>";
          filter.disabled = true;
          return;
        }

        filter.innerHTML = studentNames
          .map((name) => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            return option.outerHTML;
          })
          .join("");

        filter.disabled = false;
        filter.value = studentNames[0];

        filter.addEventListener("change", () => {
          renderRecords(filter.value);
        });

        renderRecords(filter.value);
      }

      function renderRecords(selectedStudentName) {
        const container = document.getElementById("records");
        const selectedName = normalizeValue(selectedStudentName).toLowerCase();

        const filteredRecords = allRecords.filter(
          (record) => getStudentName(record).toLowerCase() === selectedName
        );

        if (filteredRecords.length === 0) {
          container.innerHTML = '<p class="empty">No records found for this student.</p>';
          return;
        }

        container.innerHTML = filteredRecords
          .map((record) => {
            const fields = record.fields;

            return `
              <div class="record">
                <div class="student-name">
                  ${formatPlainValue(fields["student_full_name"])}
                </div>

                <div class="record-meta">
                  <div><strong>Date:</strong> ${formatDate(fields["Date"])}</div>
                  <div><strong>Duration:</strong> ${formatPlainValue(fields["Duration"])}</div>
                  <div><strong>Module:</strong> ${formatPlainValue(fields["Module"])}</div>
                </div>

                <div class="field">
                  <div class="field-label">Summary</div>
                  <div class="rich-text">${formatRichText(fields["Summary"])}</div>
                </div>

                <div class="field">
                  <div class="field-label">Tasks Assigned</div>
                  <div class="rich-text">${formatRichText(fields["Tasks Assigned"])}</div>
                </div>

                <div class="field">
                  <div class="field-label">What we'll cover next time</div>
                  <div class="rich-text">${formatRichText(fields["What we'll cover next time"])}</div>
                </div>
              </div>
            `;
          })
          .join("");
      }

      async function loadAirtable() {
        const container = document.getElementById("records");
        const filter = document.getElementById("studentFilter");

        try {
          const res = await fetch("/api/airtable");
          const data = await res.json();

          if (!res.ok) {
            container.innerHTML = `
              <div class="record">
                <strong>Error loading Airtable data</strong>
                <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
              </div>
            `;
            filter.innerHTML = "<option>Unable to load students</option>";
            return;
          }

          if (!data.records || data.records.length === 0) {
            container.innerHTML = '<p class="empty">No records found.</p>';
            filter.innerHTML = "<option>No students found</option>";
            return;
          }

          allRecords = data.records;
          setupStudentFilter(allRecords);
        } catch (error) {
          container.innerHTML = `
            <div class="record">
              <strong>Something went wrong</strong>
              <p>${escapeHtml(error.message)}</p>
            </div>
          `;
          filter.innerHTML = "<option>Unable to load students</option>";
        }
      }

      loadAirtable();
    